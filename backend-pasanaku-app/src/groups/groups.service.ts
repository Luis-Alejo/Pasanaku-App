import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
  ServiceUnavailableException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { Brackets, DataSource, Repository } from 'typeorm';
import {
  GroupDeploymentError,
  SorobanContractError,
  SorobanPasanakuService,
  SorobanRegistryService,
  StellarService,
} from '../blockchain/index.js';
import {
  DebtStatus,
  Frequency,
  GroupStatus,
  KycStatus,
  RoundPaymentStatus,
} from '../common/enums/index.js';
import { normalizePhone } from '../common/utils/identity.util.js';
import { parseStroops, usdcToStroops } from '../common/utils/usdc.util.js';
import { UserWalletService } from '../users/user-wallet.service.js';
import { UsersService } from '../users/users.service.js';
import {
  CreateGroupInput,
  InviteMemberInput,
  PayArrearsInput,
  SetTurnOrderInput,
  UpdateGroupInput,
} from './dto/group.inputs.js';
import { GroupMember } from './entities/group-member.entity.js';
import { MemberDebt } from './entities/member-debt.entity.js';
import { PasanakuGroup } from './entities/pasanaku-group.entity.js';
import { RoundPayment } from './entities/round-payment.entity.js';
import { Round } from './entities/round.entity.js';
import { chainCall, chainErrorCode } from './groups.errors.js';
import { applyQueueOrder, protectedTurnSlots } from './utils/queue.util.js';
import { GroupInvitation } from './entities/group-invitation.entity.js';

const DEFAULT_GRACE_SECONDS = 3 * 24 * 60 * 60;
const FREQUENCY_SECONDS: Record<Frequency, number> = {
  [Frequency.WEEKLY]: 7 * 24 * 60 * 60,
  [Frequency.BIWEEKLY]: 14 * 24 * 60 * 60,
  [Frequency.MONTHLY]: 30 * 24 * 60 * 60,
};
/** Margen del scheduler sobre el fin de gracia (el reloj del servidor no es el del ledger). */
const SETTLEMENT_MARGIN_MS = 5_000;
const BENIGN_SETTLE_CODES = [17, 18]; // TooEarly, InvalidState (ya liquidada): benignos para el scheduler

type WithCount = PasanakuGroup & { memberCount: number };

@Injectable()
export class GroupsService {
  private readonly logger = new Logger(GroupsService.name);

  constructor(
    @InjectRepository(PasanakuGroup)
    private readonly groups: Repository<PasanakuGroup>,
    @InjectRepository(GroupMember)
    private readonly members: Repository<GroupMember>,
    @InjectRepository(Round) private readonly rounds: Repository<Round>,
    @InjectRepository(RoundPayment)
    private readonly payments: Repository<RoundPayment>,
    @InjectRepository(MemberDebt)
    private readonly debts: Repository<MemberDebt>,
    private readonly dataSource: DataSource,
    private readonly config: ConfigService,
    private readonly users: UsersService,
    private readonly wallets: UserWalletService,
    private readonly stellar: StellarService,
    private readonly registry: SorobanRegistryService,
    private readonly pasanaku: SorobanPasanakuService,
    @InjectRepository(GroupInvitation)
    private readonly invitations: Repository<GroupInvitation>,
  ) {}

  // ───────────────────────────── Queries ─────────────────────────────

  async listPublicGroups(limit: number, offset: number): Promise<WithCount[]> {
    const rows = await this.groups.find({
      where: { isPublic: true, status: GroupStatus.OPEN, setupCompleted: true },
      order: { createdAt: 'DESC' },
      take: Math.min(Math.max(limit, 1), 50),
      skip: Math.max(offset, 0),
    });
    return this.withMemberCount(rows);
  }

  async listMyGroups(userId: string): Promise<WithCount[]> {
    const rows = await this.groups
      .createQueryBuilder('g')
      .where(
        new Brackets((qb) =>
          qb
            .where('g.creatorId = :userId', { userId })
            .orWhere(
              'g.id IN (SELECT m."groupId" FROM group_members m WHERE m."userId" = :userId)',
              { userId },
            ),
        ),
      )
      .orderBy('g.createdAt', 'DESC')
      .getMany();
    return this.withMemberCount(rows);
  }

  async getGroupDetail(userId: string, groupId: string) {
    const group = await this.groups.findOneBy({ id: groupId });
    if (!group) throw new NotFoundException('Grupo no encontrado.');
    const members = await this.members.find({
      where: { groupId },
      relations: { user: true },
      order: { currentQueuePosition: 'ASC' },
    });
    // Mismo error para "no existe" y "no autorizado": no revela grupos privados.
    if (
      group.creatorId !== userId &&
      !members.some((m) => m.userId === userId)
    ) {
      throw new NotFoundException('Grupo no encontrado.');
    }
    const rounds = await this.rounds.find({
      where: { groupId },
      relations: { payments: true },
      order: { roundNumber: 'ASC' },
    });
    const debts = await this.debts.find({
      where: { groupId },
      order: { createdAt: 'ASC' },
    });
    return {
      ...group,
      memberCount: members.length,
      members: members.map((m) => ({
        id: m.id,
        userId: m.userId,
        fullName: m.user.fullName,
        reputationScore: m.user.reputationScore,
        initialTurnOrder: m.initialTurnOrder,
        currentQueuePosition: m.currentQueuePosition,
        hasReceivedPayout: m.hasReceivedPayout,
        guaranteeBalanceStroops: m.guaranteeBalanceStroops,
        totalContributedStroops: m.totalContributedStroops,
        totalDebtStroops: m.totalDebtStroops,
        shortfallStroops: m.shortfallStroops,
        isClean: m.isClean,
        joinedAt: m.joinedAt,
      })),
      rounds,
      debts,
    };
  }

  // ─────────────────────────── Mutations ────────────────────────────

  /** Deploy + init + registry. Persiste contractAddress aunque falle un paso (reanudable). */
  async createGroup(
    userId: string,
    input: CreateGroupInput,
  ): Promise<WithCount> {
    const creator = await this.users.getByIdOrFail(userId);
    if (creator.kycStatus !== KycStatus.VERIFIED) {
      throw new ForbiddenException(
        'Debes completar la verificación KYC para crear grupos.',
      );
    }
    const contribution = usdcToStroops(input.contributionUsdc);
    if (parseStroops(contribution) <= 0n)
      throw new BadRequestException('La cuota debe ser mayor a 0.');

    const defaultRound = FREQUENCY_SECONDS[input.frequency];
    const roundDuration = input.roundDurationSeconds ?? defaultRound;
    const grace = input.graceDurationSeconds ?? DEFAULT_GRACE_SECONDS;
    if (
      this.config.get<string>('STELLAR_NETWORK') === 'PUBLIC' &&
      (roundDuration !== defaultRound || grace !== DEFAULT_GRACE_SECONDS)
    ) {
      throw new BadRequestException(
        'Duraciones personalizadas solo disponibles en Testnet.',
      );
    }
    if (
      input.isPublic &&
      !(await this.registry.canJoinPublic(creator.stellarPublicKey))
    ) {
      throw new ForbiddenException(
        'Tu reputación no te permite crear un grupo público.',
      );
    }

    let contractId: string;
    let setupCompleted = true;
    try {
      const r = await this.pasanaku.deployGroupContract({
        contribution,
        roundDurationSeconds: roundDuration,
        graceSeconds: grace,
        maxParticipants: input.maxParticipants,
        isPublic: input.isPublic,
      });
      contractId = r.contractId;
    } catch (err) {
      if (!(err instanceof GroupDeploymentError)) throw err;
      this.logger.warn(
        `Despliegue incompleto (${err.step}) contrato ${err.contractId}`,
      );
      contractId = err.contractId;
      setupCompleted = false;
    }

    const group = await this.groups.save(
      this.groups.create({
        name: input.name,
        description: input.description ?? null,
        isPublic: input.isPublic,
        creatorId: userId,
        contractAddress: contractId,
        registryAddress: this.config.getOrThrow<string>(
          'REPUTATION_REGISTRY_ID',
        ),
        adminServerAddress: this.stellar.adminPublicKey,
        contributionStroops: contribution,
        guaranteeStroops: contribution,
        maxParticipants: input.maxParticipants,
        roundDurationSeconds: roundDuration,
        graceDurationSeconds: grace,
        frequency: input.frequency,
        setupCompleted,
      }),
    );

    if (!setupCompleted) {
      try {
        await this.completeSetup(group);
      } catch (err) {
        this.logger.error(
          `Reintento de configuración falló para ${group.id}`,
          err as Error,
        );
        throw new ServiceUnavailableException(
          `El grupo ${group.id} se creó pero falta completar su configuración on-chain. Reintenta con retryGroupSetup.`,
        );
      }
    }
    return { ...group, memberCount: 0 };
  }

  async retryGroupSetup(userId: string, groupId: string): Promise<WithCount> {
    const group = await this.ownedGroup(userId, groupId);
    if (!group.setupCompleted) await this.completeSetup(group);
    return this.withMemberCount([group]).then((r) => r[0]);
  }

  /** Privados: el organizador invita por celular. Públicos: la invitación la hace joinGroup. */
  async inviteMember(
    creatorId: string,
    input: InviteMemberInput,
  ): Promise<{ txHash: string }> {
    const group = await this.ownedGroup(creatorId, input.groupId);
    const contractId = this.requireReady(group);
    if (group.isPublic)
      throw new BadRequestException(
        'Los grupos públicos no requieren invitación.',
      );
    if (group.status !== GroupStatus.OPEN)
      throw new ConflictException('El grupo ya no está abierto.');

    const invitee = await this.users.findByPhone(normalizePhone(input.phone));
    if (!invitee) throw new NotFoundException('Usuario no encontrado.');
    if (
      await this.members.existsBy({ groupId: group.id, userId: invitee.id })
    ) {
      throw new ConflictException('El usuario ya es miembro.');
    }
    const receipt = await chainCall(() =>
      this.pasanaku.inviteMember(contractId, invitee.stellarPublicKey),
    );
    await this.invitations.upsert({ groupId: group.id, userId: invitee.id }, [
      'groupId',
      'userId',
    ]);
    return { txHash: receipt.txHash };
  }

  /**
   * Unirse = (activar wallet) → (fondeo Testnet) → invite_member (admin, si público o creador)
   * → join_group (usuario). El espejo lo crea el listener al ver `joined`.
   */
  async joinGroup(
    userId: string,
    groupId: string,
  ): Promise<{ txHash: string }> {
    const group = await this.getGroupOrFail(groupId);
    const contractId = this.requireReady(group);
    if (group.status !== GroupStatus.OPEN)
      throw new ConflictException('El grupo ya no está abierto.');

    const user = await this.users.getByIdOrFail(userId);
    if (user.kycStatus !== KycStatus.VERIFIED) {
      throw new ForbiddenException(
        'Debes completar la verificación KYC para unirte a un grupo.',
      );
    }
    if (await this.members.existsBy({ groupId, userId }))
      throw new ConflictException('Ya eres miembro de este grupo.');
    if ((await this.members.countBy({ groupId })) >= group.maxParticipants) {
      throw new ConflictException('El grupo está lleno.');
    }

    if (
      !group.isPublic &&
      group.creatorId !== userId &&
      !(await this.invitations.existsBy({ groupId, userId }))
    ) {
      throw new ForbiddenException('No tienes invitación para este grupo.');
    }

    const publicKey = user.stellarPublicKey;
    // El contrato devuelve el mismo Unauthorized(3) si falla la reputación o si no eres admin: validar antes.
    if (group.isPublic && !(await this.registry.canJoinPublic(publicKey))) {
      throw new ForbiddenException(
        'Tu reputación es insuficiente para unirte a grupos públicos.',
      );
    }

    const secret = await this.wallets.getSecretKey(userId);
    await this.stellar.activateAndSetupUsdcWallet(secret); // idempotente
    await this.fundTestnet(group, publicKey);

    if (group.isPublic || group.creatorId === userId) {
      await chainCall(() => this.pasanaku.inviteMember(contractId, publicKey));
    } // privado + no creador: debe existir invitación previa (el contrato responde NotInvited)
    const receipt = await chainCall(() =>
      this.pasanaku.joinGroup(contractId, secret),
    );
    return { txHash: receipt.txHash };
  }

  /**
   * Única escritura de espejo fuera de listeners: el contrato no emite evento en set_turn_order.
   * El listener de `started` reconcilia contra getTurnQueue.
   */
  async setTurnOrder(
    creatorId: string,
    input: SetTurnOrderInput,
  ): Promise<{ txHash: string }> {
    const group = await this.ownedGroup(creatorId, input.groupId);
    const contractId = this.requireReady(group);
    if (group.status !== GroupStatus.OPEN)
      throw new ConflictException('El grupo ya no está abierto.');

    const members = await this.members.find({
      where: { groupId: group.id },
      relations: { user: true },
    });
    const byUser = new Map(members.map((m) => [m.userId, m]));
    if (
      new Set(input.userIds).size !== input.userIds.length ||
      input.userIds.length !== members.length ||
      !input.userIds.every((id) => byUser.has(id))
    ) {
      throw new BadRequestException(
        'El orden debe incluir exactamente una vez a cada miembro.',
      );
    }
    const ordered = input.userIds.map((id) => byUser.get(id)!);

    // El espejo de miembros debe estar sincronizado con la cadena.
    const onChain = await this.pasanaku.getParticipants(contractId);
    if (onChain.length !== members.length) {
      throw new ConflictException(
        'Sincronizando miembros con la blockchain; reintenta en unos segundos.',
      );
    }

    const n = ordered.length;
    const slots = protectedTurnSlots(n);
    const checks = await Promise.all(
      ordered
        .slice(0, slots)
        .map((m, i) =>
          this.registry.canTakeEarlyTurn(m.user.stellarPublicKey, i + 1, n),
        ),
    );
    const badPositions = checks
      .map((ok, i) => (ok ? 0 : i + 1))
      .filter(Boolean);
    if (badPositions.length) {
      throw new BadRequestException(
        `Las posiciones ${badPositions.join(', ')} están reservadas a miembros con reputación suficiente.`,
      );
    }

    const keys = ordered.map((m) => m.user.stellarPublicKey);
    const receipt = await chainCall(() =>
      this.pasanaku.setTurnOrder(contractId, keys),
    );
    await this.dataSource.transaction((manager) =>
      applyQueueOrder(
        manager,
        group.id,
        ordered.map((m) => m.id),
        { initial: true },
      ),
    );
    return { txHash: receipt.txHash };
  }

  async startGroup(
    creatorId: string,
    groupId: string,
  ): Promise<{ txHash: string }> {
    const group = await this.ownedGroup(creatorId, groupId);
    const contractId = this.requireReady(group);
    if (group.status !== GroupStatus.OPEN)
      throw new ConflictException('El grupo ya no está abierto.');

    const [participants, queue] = await Promise.all([
      this.pasanaku.getParticipants(contractId),
      this.pasanaku.getTurnQueue(contractId),
    ]);
    if (participants.length < 2)
      throw new BadRequestException('Se necesitan al menos 2 miembros.');
    if (queue.length !== participants.length) {
      throw new BadRequestException(
        'Define el orden de turnos con todos los miembros antes de iniciar.',
      );
    }
    const receipt = await chainCall(() => this.pasanaku.startGroup(contractId));
    return { txHash: receipt.txHash }; // Round 1 la crea el listener de `started`
  }

  /** Sin validación de tiempo con Date.now(): el contrato decide con el reloj del ledger. */
  async payRound(userId: string, groupId: string): Promise<{ txHash: string }> {
    const group = await this.getGroupOrFail(groupId);
    const contractId = this.requireReady(group);
    if (group.status !== GroupStatus.ACTIVE)
      throw new ConflictException('El grupo no está activo.');
    const member = await this.members.findOneBy({ groupId, userId });
    if (!member) throw new ForbiddenException('No eres miembro de este grupo.');

    const round = await this.rounds.findOneBy({
      groupId,
      roundNumber: group.currentRound,
    });
    if (round) {
      const payment = await this.payments.findOneBy({
        roundId: round.id,
        memberId: member.id,
      });
      if (payment && payment.status !== RoundPaymentStatus.PENDING) {
        throw new ConflictException('Tu pago de esta ronda ya fue registrado.');
      }
    }
    const secret = await this.wallets.getSecretKey(userId);
    const receipt = await chainCall(() =>
      this.pasanaku.payRound(contractId, secret),
    );
    return { txHash: receipt.txHash };
  }

  async payArrears(
    userId: string,
    input: PayArrearsInput,
  ): Promise<{ txHash: string }> {
    const group = await this.getGroupOrFail(input.groupId);
    const contractId = this.requireReady(group);
    if (group.status === GroupStatus.OPEN)
      throw new ConflictException('El grupo aún no inició.');
    const member = await this.members.findOneBy({ groupId: group.id, userId });
    if (!member) throw new ForbiddenException('No eres miembro de este grupo.');

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
    if (!debt || debt.status === DebtStatus.SETTLED)
      throw new NotFoundException(
        'No tienes una deuda pendiente en esa ronda.',
      );

    const remaining = BigInt(debt.remainingAmountStroops);
    const amount = input.amountUsdc
      ? BigInt(usdcToStroops(input.amountUsdc))
      : remaining;
    if (amount <= 0n || amount > remaining)
      throw new BadRequestException('Monto inválido para esta deuda.');

    const secret = await this.wallets.getSecretKey(userId);
    const receipt = await chainCall(() =>
      this.pasanaku.payArrears(
        contractId,
        secret,
        input.round,
        amount.toString(),
      ),
    );
    return { txHash: receipt.txHash };
  }

  // ─────────────────────────── Scheduler ────────────────────────────

  /** Grupos ACTIVE cuya gracia (según el espejo) ya venció con margen. */
  async findGroupIdsDueForSettlement(): Promise<string[]> {
    const limit = new Date(Date.now() - SETTLEMENT_MARGIN_MS);
    const rows = await this.groups
      .createQueryBuilder('g')
      .select('g.id', 'id')
      .where('g.status = :s', { s: GroupStatus.ACTIVE })
      .andWhere('g.graceDeadline IS NOT NULL AND g.graceDeadline < :limit', {
        limit,
      })
      .getRawMany<{ id: string }>();
    return rows.map((r) => r.id);
  }

  /** Devuelve null si el contrato indica que aún es pronto o ya se liquidó (espejo atrasado). */
  async triggerRoundSettlement(
    groupId: string,
  ): Promise<{ txHash: string; beneficiary: string | null } | null> {
    const group = await this.getGroupOrFail(groupId);
    const contractId = this.requireReady(group);
    if (group.status !== GroupStatus.ACTIVE) return null;
    if (
      !group.graceDeadline ||
      Date.now() < group.graceDeadline.getTime() + SETTLEMENT_MARGIN_MS
    )
      return null;
    try {
      const r = await this.pasanaku.settleRound(contractId);
      return { txHash: r.txHash, beneficiary: r.beneficiary };
    } catch (err) {
      const code = chainErrorCode(err);
      if (code !== null && BENIGN_SETTLE_CODES.includes(code)) return null;
      throw err;
    }
  }

  // ──────────────────────────── Helpers ─────────────────────────────

  /** Reanuda un despliegue parcial: init si falta y autorización en el registry (idempotente). */
  private async completeSetup(group: PasanakuGroup): Promise<void> {
    const contractId = this.requireContract(group);
    try {
      await this.pasanaku.getConfig(contractId);
    } catch (err) {
      if (
        err instanceof SorobanContractError &&
        err.contract === 'pasanaku' &&
        Number(err.code) === 2
      ) {
        await this.pasanaku.initializeGroupContract(contractId, {
          contribution: group.contributionStroops,
          roundDurationSeconds: group.roundDurationSeconds,
          graceSeconds: group.graceDurationSeconds,
          maxParticipants: group.maxParticipants,
          isPublic: group.isPublic,
        });
      } else {
        throw err;
      }
    }
    await this.registry.setGroup(contractId, true);
    await this.groups.update(group.id, { setupCompleted: true });
    group.setupCompleted = true;
  }

  /** Solo Testnet: cubre garantía + todas las cuotas posibles con USDC emitido por el admin. */
  private async fundTestnet(
    group: PasanakuGroup,
    publicKey: string,
  ): Promise<void> {
    if (this.config.get<string>('STELLAR_NETWORK') !== 'TESTNET') return;
    const amount =
      BigInt(group.guaranteeStroops) +
      BigInt(group.contributionStroops) * BigInt(group.maxParticipants);
    await this.stellar.mintTestnetUsdc(publicKey, amount.toString());
  }

  private async getGroupOrFail(groupId: string): Promise<PasanakuGroup> {
    const group = await this.groups.findOneBy({ id: groupId });
    if (!group) throw new NotFoundException('Grupo no encontrado.');
    return group;
  }

  private async ownedGroup(
    userId: string,
    groupId: string,
  ): Promise<PasanakuGroup> {
    const group = await this.getGroupOrFail(groupId);
    if (group.creatorId !== userId)
      throw new ForbiddenException('Solo el organizador puede hacer esto.');
    return group;
  }

  private requireContract(group: PasanakuGroup): string {
    if (!group.contractAddress)
      throw new ConflictException('El grupo no tiene contrato desplegado.');
    return group.contractAddress;
  }

  private requireReady(group: PasanakuGroup): string {
    const id = this.requireContract(group);
    if (!group.setupCompleted)
      throw new ConflictException(
        'El grupo aún no terminó su configuración on-chain.',
      );
    return id;
  }

  private async withMemberCount(groups: PasanakuGroup[]): Promise<WithCount[]> {
    if (!groups.length) return [];
    const rows = await this.members
      .createQueryBuilder('m')
      .select('m.groupId', 'groupId')
      .addSelect('COUNT(*)', 'count')
      .where('m.groupId IN (:...ids)', { ids: groups.map((g) => g.id) })
      .groupBy('m.groupId')
      .getRawMany<{ groupId: string; count: string }>();
    const counts = new Map(rows.map((r) => [r.groupId, Number(r.count)]));
    return groups.map((g) =>
      Object.assign(g, { memberCount: counts.get(g.id) ?? 0 }),
    );
  }

  async groupPreview(userId: string, groupId: string) {
    const group = await this.groups.findOneBy({ id: groupId });
    if (!group) throw new NotFoundException('Grupo no encontrado.');
    const [isMember, isInvited] = await Promise.all([
      this.members.existsBy({ groupId, userId }),
      this.invitations.existsBy({ groupId, userId }),
    ]);
    if (
      !group.isPublic &&
      !isMember &&
      !isInvited &&
      group.creatorId !== userId
    ) {
      throw new NotFoundException('Grupo no encontrado.');
    }
    const [g] = await this.withMemberCount([group]);
    return { ...g, isMember, isInvited };
  }

  async myInvitations(userId: string): Promise<WithCount[]> {
    const rows = await this.invitations.find({
      where: { userId },
      relations: { group: true },
      order: { createdAt: 'DESC' },
    });
    return this.withMemberCount(
      rows.map((r) => r.group).filter((g) => g.status === GroupStatus.OPEN),
    );
  }

  async updateGroup(
    userId: string,
    input: UpdateGroupInput,
  ): Promise<WithCount> {
    const group = await this.ownedGroup(userId, input.groupId);
    if (group.status !== GroupStatus.OPEN)
      throw new ConflictException('Solo se puede editar un grupo abierto.');
    const patch: Partial<PasanakuGroup> = {};
    if (input.name !== undefined) patch.name = input.name;
    if (input.description !== undefined) patch.description = input.description;
    if (Object.keys(patch).length) await this.groups.update(group.id, patch);
    return (await this.withMemberCount([Object.assign(group, patch)]))[0];
  }

  async cancelGroup(userId: string, groupId: string): Promise<WithCount> {
    const group = await this.ownedGroup(userId, groupId);
    if (group.status !== GroupStatus.OPEN)
      throw new ConflictException('Solo se puede cancelar un grupo abierto.');
    const onChain =
      group.contractAddress && group.setupCompleted
        ? (await this.pasanaku.getParticipants(group.contractAddress)).length
        : 0;
    const mirrored = await this.members.countBy({ groupId });
    if (Math.max(onChain, mirrored) > 1) {
      throw new ConflictException(
        'No se puede cancelar un grupo con más de un miembro: las garantías están en el contrato.',
      );
    }
    await this.groups.update(groupId, { status: GroupStatus.CANCELLED });
    group.status = GroupStatus.CANCELLED;
    return (await this.withMemberCount([group]))[0];
  }
}
