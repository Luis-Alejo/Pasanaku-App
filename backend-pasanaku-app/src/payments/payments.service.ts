import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { randomUUID } from 'node:crypto';
import { Repository } from 'typeorm';
import { StellarService } from '../blockchain/index.js';
import { DebtStatus, GroupStatus, KycStatus } from '../common/enums/index.js';
import { GroupMember } from '../groups/entities/group-member.entity.js';
import { MemberDebt } from '../groups/entities/member-debt.entity.js';
import { PasanakuGroup } from '../groups/entities/pasanaku-group.entity.js';
import { Round } from '../groups/entities/round.entity.js';
import { GroupsService } from '../groups/groups.service.js';
import { TransactionRecordType } from '../transactions/dto/transaction.types.js';
import { Transaction } from '../transactions/entities/transaction.entity.js';
import { TX_STATUS, TX_TYPE } from '../transactions/transactions.constants.js';
import { TransactionsService } from '../transactions/transactions.service.js';
import { UserWalletService } from '../users/user-wallet.service.js';
import { UsersService } from '../users/users.service.js';
import {
  InitiateQrPaymentInput,
  PaymentPurpose,
  QrPaymentType,
} from './dto/payments.dto.js';
import {
  bobCentsToStroops,
  centsToBobString,
  parseBobToCents,
  rateToScaled,
  rateToString,
  stroopsToBobCents,
  stroopsToDecimal,
} from './payments.utils.js';
import { PollarService, QrPayment } from './pollar.service.js';

const MIN_TOPUP_CENTS = 500n; // 5 BOB
const MAX_TOPUP_CENTS = 2_000_000n; // 20 000 BOB
const PAID_STATUSES = new Set([
  'paid',
  'confirmed',
  'completed',
  'succeeded',
  'success',
]); // ASUMIDO
const STALLED_AFTER_MS = 2 * 60_000;
const GIVE_UP_AFTER_MS = 24 * 60 * 60_000;

/**
 * Modelo: el pago en BOB SOLO acredita USDC en la wallet custodial (fila DEPOSIT).
 * Después se intenta, en mejor esfuerzo, la operación del grupo (join / payRound / payArrears),
 * que registra su propia fila con su hash on-chain vía el listener de transactions/.
 * Si esa operación falla, el USDC queda en la wallet y el usuario reintenta la mutation normal.
 */
@Injectable()
export class PaymentsService {
  private readonly logger = new Logger(PaymentsService.name);

  constructor(
    @InjectRepository(PasanakuGroup)
    private readonly groups: Repository<PasanakuGroup>,
    @InjectRepository(GroupMember)
    private readonly members: Repository<GroupMember>,
    @InjectRepository(Round) private readonly rounds: Repository<Round>,
    @InjectRepository(MemberDebt)
    private readonly debts: Repository<MemberDebt>,
    private readonly config: ConfigService,
    private readonly pollar: PollarService,
    private readonly transactions: TransactionsService,
    private readonly users: UsersService,
    private readonly wallets: UserWalletService,
    private readonly stellar: StellarService,
    private readonly groupsService: GroupsService,
  ) {}

  // ───────────────────────────── Iniciar pago ─────────────────────────────

  async initiateFiatContribution(
    userId: string,
    input: InitiateQrPaymentInput,
  ): Promise<QrPaymentType> {
    const user = await this.users.getByIdOrFail(userId);
    if (user.kycStatus !== KycStatus.VERIFIED) {
      throw new ForbiddenException(
        'Debes completar la verificación KYC para pagar con QR.',
      );
    }
    const target = await this.resolveTarget(userId, input);

    const rate4 = rateToScaled(await this.pollar.getBobPerUsdc());
    let cents: bigint;
    let stroops: bigint;
    if (input.purpose === PaymentPurpose.TOPUP) {
      cents = this.parseTopup(input.amountBob);
      stroops = bobCentsToStroops(cents, rate4);
    } else {
      stroops = target.stroops;
      cents = stroopsToBobCents(stroops, rate4);
    }

    const { tx } = await this.transactions.createPendingTransaction({
      userId,
      type: TX_TYPE.DEPOSIT,
      idempotencyKey: `fiat:${userId}:${input.idempotencyKey ?? randomUUID()}`,
      amountStroops: stroops.toString(),
      groupId: target.groupId,
      roundId: target.roundId,
      fiatAmount: centsToBobString(cents),
      exchangeRate: rateToString(rate4),
    });
    if (tx.status !== TX_STATUS.PENDING_FIAT)
      throw new ConflictException('Este pago ya fue procesado.');

    let qr: QrPayment;
    if (tx.pollarReference) {
      qr = await this.pollar.getQrPayment(tx.pollarReference, tx.fiatAmount!);
    } else {
      qr = await this.pollar.createQrPayment({
        amountBob: tx.fiatAmount!,
        reference: tx.id,
        description: 'Pasanaku On-Chain',
      });
      await this.transactions.attachPollarReference(tx.id, qr.pollarReference);
    }
    return {
      transactionId: tx.id,
      pollarReference: qr.pollarReference,
      qrPayload: qr.qrPayload,
      qrImageBase64: qr.qrImageBase64,
      amountBob: tx.fiatAmount!,
      amountStroops: tx.amountStroops,
      exchangeRate: tx.exchangeRate!,
      expiresAt: qr.expiresAt,
      mock: this.pollar.isMock,
    };
  }

  // ───────────────────────────── Confirmación ─────────────────────────────

  /** Webhook público: valida firma sobre el cuerpo crudo y responde rápido; acredita en segundo plano. */
  async handlePollarWebhook(
    rawBody: Buffer | undefined,
    payload: Record<string, unknown>,
    signature: string | undefined,
  ): Promise<{ received: true }> {
    if (!this.pollar.verifySignature(rawBody, signature))
      throw new UnauthorizedException('Firma inválida.');
    const body =
      (payload.data as Record<string, unknown> | undefined) ?? payload; // ASUMIDO
    const reference = String(
      body.reference ?? body.pollarReference ?? body.id ?? '',
    );
    const status =
      String(body.status ?? payload.event ?? '')
        .toLowerCase()
        .split('.')
        .pop() ?? '';
    if (reference && PAID_STATUSES.has(status))
      await this.confirmPayment(reference, false);
    return { received: true };
  }

  /** Solo modo simulación y solo para el dueño del QR (reemplaza el endpoint REST público de simulación). */
  async simulatePayment(
    userId: string,
    pollarReference: string,
  ): Promise<TransactionRecordType> {
    if (!this.pollar.isMock)
      throw new ForbiddenException('Disponible solo en modo simulación.');
    const tx = await this.transactions.findByPollarReference(pollarReference);
    if (!tx || tx.userId !== userId)
      throw new NotFoundException('Pago no encontrado.');
    await this.confirmPayment(pollarReference, true);
    return this.transactions.toRecord(
      (await this.transactions.findById(tx.id))!,
      true,
    );
  }

  /** Para el scheduler (Tarea 6): retoma depósitos confirmados en fiat que no llegaron a acreditarse. */
  async resumeStalledPayments(): Promise<number> {
    const stalled = await this.transactions.findStalledDeposits(
      new Date(Date.now() - STALLED_AFTER_MS),
    );
    for (const tx of stalled) {
      if (Date.now() - tx.createdAt.getTime() > GIVE_UP_AFTER_MS) {
        await this.transactions.markFailed(
          tx.id,
          'No se pudo acreditar en 24 h',
        );
        continue;
      }
      await this.fulfil(tx);
    }
    return stalled.length;
  }

  // ───────────────────────────── Internos ─────────────────────────────

  private async confirmPayment(
    reference: string,
    wait: boolean,
  ): Promise<void> {
    const tx = await this.transactions.findByPollarReference(reference);
    if (!tx) {
      this.logger.warn(`Webhook para referencia desconocida ${reference}`);
      return;
    }
    // Atómico: solo UN llamador gana el paso PENDING_FIAT -> CHAIN_SUBMITTED (anti doble acreditación).
    if (!(await this.transactions.markChainSubmitted(tx.id))) return;
    const job = this.fulfil(tx);
    if (wait) await job;
  }

  /** Nunca lanza: deja la fila en CHAIN_SUBMITTED para que resumeStalledPayments la reintente. */
  private async fulfil(tx: Transaction): Promise<void> {
    try {
      let creditHash: string | null = null;
      if (this.config.get<string>('STELLAR_NETWORK') === 'TESTNET') {
        const user = await this.users.getByIdOrFail(tx.userId);
        await this.stellar.activateAndSetupUsdcWallet(
          await this.wallets.getSecretKey(tx.userId),
        );
        creditHash = (
          await this.stellar.mintTestnetUsdc(
            user.stellarPublicKey,
            tx.amountStroops,
          )
        ).txHash;
      } // Mainnet: Pollar entrega el USDC directo a la wallet del usuario
      await this.transactions.markConfirmed(tx.id, creditHash);
    } catch (error) {
      this.logger.error(
        `Acreditación ${tx.id} falló (se reintentará): ${(error as Error).message}`,
      );
      return;
    }
    try {
      await this.followUp(tx);
    } catch (error) {
      this.logger.warn(
        `USDC acreditado pero la operación del grupo falló (${tx.id}): ${(error as Error).message}`,
      );
    }
  }

  /** La intención se deduce del estado actual: sin groupId = recarga; con roundId = deuda; si no, unirse o pagar. */
  private async followUp(tx: Transaction): Promise<void> {
    if (!tx.groupId) return;
    const group = await this.groups.findOneBy({ id: tx.groupId });
    if (!group) return;
    const member = await this.members.findOneBy({
      groupId: group.id,
      userId: tx.userId,
    });

    if (tx.roundId) {
      const round = await this.rounds.findOneBy({ id: tx.roundId });
      const debt =
        round && member
          ? await this.debts.findOneBy({
              groupId: group.id,
              originalRoundId: round.id,
              debtorMemberId: member.id,
            })
          : null;
      if (!round || !debt || debt.status === DebtStatus.SETTLED) return;
      const remaining = BigInt(debt.remainingAmountStroops);
      const credited = BigInt(tx.amountStroops);
      await this.groupsService.payArrears(tx.userId, {
        groupId: group.id,
        round: round.roundNumber,
        amountUsdc:
          credited < remaining ? stroopsToDecimal(credited) : undefined,
      });
    } else if (!member && group.status === GroupStatus.OPEN) {
      await this.groupsService.joinGroup(tx.userId, group.id);
    } else if (member && group.status === GroupStatus.ACTIVE) {
      await this.groupsService.payRound(tx.userId, group.id);
    }
  }

  private parseTopup(amountBob?: string): bigint {
    if (!amountBob)
      throw new BadRequestException('amountBob es obligatorio para TOPUP.');
    const cents = parseBobToCents(amountBob);
    if (cents < MIN_TOPUP_CENTS || cents > MAX_TOPUP_CENTS) {
      throw new BadRequestException(
        'El monto debe estar entre 5 y 20 000 BOB.',
      );
    }
    return cents;
  }

  /** Valida que la operación objetivo sea posible ANTES de cobrar en BOB y calcula el USDC necesario. */
  private async resolveTarget(userId: string, input: InitiateQrPaymentInput) {
    const none = {
      groupId: null as string | null,
      roundId: null as string | null,
      stroops: 0n,
    };
    if (input.purpose === PaymentPurpose.TOPUP) return none;
    if (!input.groupId)
      throw new BadRequestException('groupId es obligatorio.');

    const group = await this.groups.findOneBy({ id: input.groupId });
    if (!group) throw new NotFoundException('Grupo no encontrado.');
    const member = await this.members.findOneBy({ groupId: group.id, userId });

    switch (input.purpose) {
      case PaymentPurpose.JOIN:
        if (member)
          throw new ConflictException('Ya eres miembro de este grupo.');
        if (group.status !== GroupStatus.OPEN || !group.setupCompleted) {
          throw new ConflictException('El grupo no está abierto.');
        }
        return {
          ...none,
          groupId: group.id,
          stroops: BigInt(group.guaranteeStroops),
        };
      case PaymentPurpose.CONTRIBUTION:
        if (!member)
          throw new ForbiddenException('No eres miembro de este grupo.');
        if (group.status !== GroupStatus.ACTIVE)
          throw new ConflictException('El grupo no está activo.');
        return {
          ...none,
          groupId: group.id,
          stroops: BigInt(group.contributionStroops),
        };
      case PaymentPurpose.ARREARS: {
        if (!member)
          throw new ForbiddenException('No eres miembro de este grupo.');
        if (!input.round)
          throw new BadRequestException('round es obligatorio para ARREARS.');
        const round = await this.rounds.findOneBy({
          groupId: group.id,
          roundNumber: input.round,
        });
        const debt = round
          ? await this.debts.findOneBy({
              groupId: group.id,
              originalRoundId: round.id,
              debtorMemberId: member.id,
            })
          : null;
        if (!round || !debt || debt.status === DebtStatus.SETTLED) {
          throw new NotFoundException(
            'No tienes una deuda pendiente en esa ronda.',
          );
        }
        return {
          groupId: group.id,
          roundId: round.id,
          stroops: BigInt(debt.remainingAmountStroops),
        };
      }
      default:
        throw new BadRequestException('Propósito inválido.');
    }
  }
}
