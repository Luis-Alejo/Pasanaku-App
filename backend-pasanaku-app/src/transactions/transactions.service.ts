import {
  ConflictException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { EntityManager, IsNull, LessThan, Not, Repository } from 'typeorm';
import type {
  TransactionStatus,
  TransactionType,
} from '../common/enums/index.js';
import { GroupMember } from '../groups/entities/group-member.entity.js';
import { PasanakuGroup } from '../groups/entities/pasanaku-group.entity.js';
import { TransactionRecordType, clampPage } from './dto/transaction.types.js';
import { Transaction } from './entities/transaction.entity.js';
import { TX_STATUS, TX_TYPE } from './transactions.constants.js';

export interface CreatePendingInput {
  userId: string;
  type: TransactionType;
  idempotencyKey: string;
  amountStroops: string;
  groupId?: string | null;
  roundId?: string | null;
  fiatAmount?: string | null;
  exchangeRate?: string | null;
}

export interface RecordChainInput {
  /** Normalmente `chain:${eventId}`: idempotente ante reintentos del indexador. */
  idempotencyKey: string;
  userId: string;
  type: TransactionType;
  amountStroops: string;
  stellarTxHash: string;
  groupId?: string | null;
  roundId?: string | null;
  /** Hora del ledger (para ordenar el historial por tiempo real on-chain). */
  occurredAt?: Date;
}

@Injectable()
export class TransactionsService {
  private readonly logger = new Logger(TransactionsService.name);

  constructor(
    @InjectRepository(Transaction)
    private readonly txs: Repository<Transaction>,
    @InjectRepository(GroupMember)
    private readonly members: Repository<GroupMember>,
    @InjectRepository(PasanakuGroup)
    private readonly groups: Repository<PasanakuGroup>,
  ) {}

  // ───────────────── Registro (uso interno de payments/ y listeners) ─────────────────

  /** Idempotente: misma `idempotencyKey` => devuelve la fila existente (created=false). */
  async createPendingTransaction(
    input: CreatePendingInput,
  ): Promise<{ tx: Transaction; created: boolean }> {
    const result = await this.txs
      .createQueryBuilder()
      .insert()
      .into(Transaction)
      .values({
        userId: input.userId,
        groupId: input.groupId ?? null,
        roundId: input.roundId ?? null,
        type: input.type,
        status: TX_STATUS.PENDING_FIAT,
        idempotencyKey: input.idempotencyKey,
        amountStroops: input.amountStroops,
        fiatAmount: input.fiatAmount ?? null,
        exchangeRate: input.exchangeRate ?? null,
      })
      .orIgnore()
      .returning('id')
      .execute();
    const tx = await this.txs.findOneByOrFail({
      idempotencyKey: input.idempotencyKey,
    });
    if (tx.userId !== input.userId)
      throw new ConflictException('Clave de idempotencia ya utilizada.');
    return { tx, created: result.raw.length > 0 };
  }

  async attachPollarReference(
    id: string,
    pollarReference: string,
  ): Promise<void> {
    await this.txs.update(id, { pollarReference });
  }

  /**
   * Transición atómica `from` -> CHAIN_SUBMITTED. Devuelve true solo a UN llamador:
   * es lo que impide acreditar dos veces ante webhooks duplicados o concurrentes.
   */
  async markChainSubmitted(
    id: string,
    from: TransactionStatus = TX_STATUS.PENDING_FIAT,
  ): Promise<boolean> {
    const r = await this.txs.update(
      { id, status: from },
      { status: TX_STATUS.CHAIN_SUBMITTED },
    );
    return (r.affected ?? 0) > 0;
  }

  async markConfirmed(
    id: string,
    stellarTxHash?: string | null,
  ): Promise<void> {
    await this.txs.update(id, {
      status: TX_STATUS.CONFIRMED,
      ...(stellarTxHash ? { stellarTxHash } : {}),
    });
  }

  async markFailed(id: string, reason: string): Promise<void> {
    this.logger.warn(`Transacción ${id} marcada FAILED: ${reason}`);
    await this.txs.update(id, { status: TX_STATUS.FAILED });
  }

  /** Registra una operación ya confirmada on-chain. Idempotente (por clave o por hash). */
  async recordChainTransaction(
    input: RecordChainInput,
    manager?: EntityManager,
  ): Promise<boolean> {
    const result = await (manager ?? this.txs.manager)
      .createQueryBuilder()
      .insert()
      .into(Transaction)
      .values({
        userId: input.userId,
        groupId: input.groupId ?? null,
        roundId: input.roundId ?? null,
        type: input.type,
        status: TX_STATUS.CONFIRMED,
        idempotencyKey: input.idempotencyKey,
        amountStroops: input.amountStroops,
        stellarTxHash: input.stellarTxHash,
        ...(input.occurredAt ? { createdAt: input.occurredAt } : {}),
      })
      .orIgnore()
      .returning('id')
      .execute();
    return result.raw.length > 0;
  }

  findByPollarReference(pollarReference: string): Promise<Transaction | null> {
    return this.txs.findOneBy({ pollarReference });
  }

  findById(id: string): Promise<Transaction | null> {
    return this.txs.findOneBy({ id });
  }

  /** Depósitos con el pago fiat confirmado pero sin USDC acreditado (proceso caído a medias). */
  findStalledDeposits(olderThan: Date, limit = 20): Promise<Transaction[]> {
    return this.txs.find({
      where: {
        type: TX_TYPE.DEPOSIT,
        status: TX_STATUS.CHAIN_SUBMITTED,
        stellarTxHash: IsNull(),
        updatedAt: LessThan(olderThan),
      },
      order: { updatedAt: 'ASC' },
      take: limit,
    });
  }

  // ───────────────────────────── Consultas ─────────────────────────────

  async myTransactions(
    userId: string,
    limit: number,
    offset: number,
  ): Promise<TransactionRecordType[]> {
    const rows = await this.txs.find({
      where: { userId },
      order: { createdAt: 'DESC' },
      ...clampPage(limit, offset),
    });
    return rows.map((t) => this.toRecord(t, true));
  }

  /**
   * Historial verificable del grupo (solo miembros o creador). Solo operaciones CONFIRMED
   * y sin depósitos (son privados); los datos fiat nunca se exponen a otros miembros.
   */
  async groupTransactions(
    groupId: string,
    requesterId: string,
    limit: number,
    offset: number,
  ): Promise<TransactionRecordType[]> {
    const group = await this.groups.findOne({
      where: { id: groupId },
      select: { id: true, creatorId: true },
    });
    const allowed =
      group &&
      (group.creatorId === requesterId ||
        (await this.members.existsBy({ groupId, userId: requesterId })));
    if (!allowed) throw new NotFoundException('Grupo no encontrado.');

    const rows = await this.txs.find({
      where: {
        groupId,
        status: TX_STATUS.CONFIRMED,
        type: Not(TX_TYPE.DEPOSIT),
      },
      relations: { user: true },
      order: { createdAt: 'DESC' },
      ...clampPage(limit, offset),
    });
    return rows.map((t) => this.toRecord(t, t.userId === requesterId));
  }

  toRecord(t: Transaction, includeFiat: boolean): TransactionRecordType {
    const hasFiat = includeFiat && t.fiatAmount !== null;
    return {
      id: t.id,
      type: t.type,
      status: t.status,
      userId: t.userId,
      userFullName: t.user?.fullName ?? null,
      groupId: t.groupId,
      roundId: t.roundId,
      amountStroops: t.amountStroops,
      fiatCurrency: hasFiat ? t.fiatCurrency : null,
      fiatAmount: hasFiat ? t.fiatAmount : null,
      exchangeRate: hasFiat ? t.exchangeRate : null,
      stellarTxHash: t.stellarTxHash,
      createdAt: t.createdAt,
      updatedAt: t.updatedAt,
    };
  }
}
