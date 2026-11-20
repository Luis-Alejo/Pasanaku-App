import { Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { EntityManager } from 'typeorm';
import { SorobanPasanakuService } from '../blockchain/index.js';
import {
  DebtStatus,
  GroupStatus,
  RoundPaymentStatus,
} from '../common/enums/index.js';
import { User } from '../users/entities/user.entity.js';
import {
  BaseGroupEvent,
  GROUP_EVENT,
  type GroupArrearsEvent,
  type GroupCompletedEvent,
  type GroupDebtEvent,
  type GroupDefaultedEvent,
  type GroupExemptEvent,
  type GroupFinalPayEvent,
  type GroupJoinedEvent,
  type GroupNoBeneficiaryEvent,
  type GroupPaidEvent,
  type GroupPayoutEvent,
  type GroupSlashedEvent,
  type GroupStartedEvent,
} from './group-event.types.js';
import { GroupMember } from './entities/group-member.entity.js';
import { MemberDebt } from './entities/member-debt.entity.js';
import { PasanakuGroup } from './entities/pasanaku-group.entity.js';
import { RoundPayment } from './entities/round-payment.entity.js';
import { Round } from './entities/round.entity.js';
import { applyQueueOrder } from './utils/queue.util.js';
import { GroupInvitation } from './entities/group-invitation.entity.js';
import { TransactionsService } from '../transactions/transactions.service.js';
import { TX_TYPE } from '../transactions/transactions.constants.js';

const OPTS = { suppressErrors: false } as const;
const add = (a: string, b: string | bigint): string =>
  (BigInt(a) + BigInt(b)).toString();
const sub = (a: string, b: string | bigint): string => {
  const r = BigInt(a) - BigInt(b);
  return (r < 0n ? 0n : r).toString();
};

/**
 * Único escritor del espejo. Todo se escribe con `e.manager` (misma transacción que el
 * registro del evento) y es idempotente. Sin llamadas RPC salvo reconciliar la cola en `started`:
 * los plazos salen de `ledgerClosedAt`, la cola se deriva determinísticamente de los eventos.
 */
@Injectable()
export class GroupEventsListener {
  private readonly logger = new Logger(GroupEventsListener.name);

  constructor(
    private readonly pasanaku: SorobanPasanakuService,
    private readonly transactions: TransactionsService,
  ) {}

  @OnEvent(GROUP_EVENT.JOINED, OPTS)
  async onJoined(e: GroupJoinedEvent): Promise<void> {
    const group = await this.group(e);
    if (!group) return;
    const m = e.manager;
    const user = await m.findOneBy(User, { stellarPublicKey: e.user });
    if (!user) throw new Error(`joined: usuario ${e.user} no existe en BD`);
    await m.delete(GroupInvitation, { groupId: group.id, userId: user.id });
    if (await m.existsBy(GroupMember, { groupId: group.id, userId: user.id }))
      return;
    const order = (await m.countBy(GroupMember, { groupId: group.id })) + 1;
    await m.insert(GroupMember, {
      userId: user.id,
      groupId: group.id,
      initialTurnOrder: order,
      currentQueuePosition: order,
      guaranteeBalanceStroops: e.guaranteeAmount,
    });
  }

  @OnEvent(GROUP_EVENT.STARTED, OPTS)
  async onStarted(e: GroupStartedEvent): Promise<void> {
    const group = await this.group(e);
    if (!group) return;
    const m = e.manager;
    // set_turn_order no emite evento: la cola on-chain (congelada al iniciar) es la verdad.
    const chainQueue = await this.pasanaku.getTurnQueue(e.contractId);
    const members = await m
      .createQueryBuilder(GroupMember, 'm')
      .innerJoinAndSelect('m.user', 'u')
      .where('m.groupId = :id', { id: group.id })
      .getMany();
    const byKey = new Map(members.map((x) => [x.user.stellarPublicKey, x.id]));
    const ordered = chainQueue.map((pk) => {
      const id = byKey.get(pk);
      if (!id) throw new Error(`started: ${pk} está en la cola pero no en BD`);
      return id;
    });
    await applyQueueOrder(m, group.id, ordered, { initial: true });
    await m.update(PasanakuGroup, group.id, { status: GroupStatus.ACTIVE });
    await this.openRound(m, group, 1, e.ledgerClosedAt, 0n);
  }

  @OnEvent(GROUP_EVENT.PAID, OPTS)
  async onPaid(e: GroupPaidEvent): Promise<void> {
    const group = await this.group(e);
    if (!group) return;
    const m = e.manager;
    const member = await this.memberByKey(m, group.id, e.user);
    const round = await this.roundOf(m, group.id, e.round);
    const payment = await this.paymentOf(m, round.id, member.id);
    if (payment.status !== RoundPaymentStatus.PENDING) return;
    await m.update(RoundPayment, payment.id, {
      status:
        e.ledgerClosedAt <= round.deadline
          ? RoundPaymentStatus.PAID
          : RoundPaymentStatus.PAID_IN_GRACE,
      paidAt: e.ledgerClosedAt,
      txHash: e.txHash,
    });
    await m.update(GroupMember, member.id, {
      totalContributedStroops: add(member.totalContributedStroops, e.amount),
    });
  }

  @OnEvent(GROUP_EVENT.SLASHED, OPTS)
  async onSlashed(e: GroupSlashedEvent): Promise<void> {
    const group = await this.group(e);
    if (!group) return;
    const m = e.manager;
    const member = await this.memberByKey(m, group.id, e.user);
    const round = await this.roundOf(m, group.id, e.round);
    const payment = await this.paymentOf(m, round.id, member.id);
    if (payment.status !== RoundPaymentStatus.PENDING) return;
    await m.update(RoundPayment, payment.id, {
      status: RoundPaymentStatus.COVERED_BY_GUARANTEE,
      txHash: e.txHash,
    });
    await m.update(GroupMember, member.id, {
      guaranteeBalanceStroops: sub(member.guaranteeBalanceStroops, e.amount),
      totalContributedStroops: add(member.totalContributedStroops, e.amount),
      isClean: false,
    });
  }

  @OnEvent(GROUP_EVENT.DEFAULTED, OPTS)
  async onDefaulted(e: GroupDefaultedEvent): Promise<void> {
    const group = await this.group(e);
    if (!group) return;
    const m = e.manager;
    const member = await this.memberByKey(m, group.id, e.user);
    const round = await this.roundOf(m, group.id, e.round);
    const payment = await this.paymentOf(m, round.id, member.id);
    if (payment.status !== RoundPaymentStatus.PENDING) return;
    await m.update(RoundPayment, payment.id, {
      status: RoundPaymentStatus.DEFAULTED,
    });
    await m.update(GroupMember, member.id, { isClean: false });
  }

  @OnEvent(GROUP_EVENT.EXEMPT, OPTS)
  async onExempt(e: GroupExemptEvent): Promise<void> {
    const group = await this.group(e);
    if (!group) return;
    const m = e.manager;
    const member = await this.memberByKey(m, group.id, e.user);
    const round = await this.roundOf(m, group.id, e.round);
    const payment = await this.paymentOf(m, round.id, member.id);
    if (payment.status !== RoundPaymentStatus.PENDING) return;
    await m.update(RoundPayment, payment.id, {
      status: RoundPaymentStatus.EXEMPT,
      paidAt: e.ledgerClosedAt,
      txHash: e.txHash,
    });
  }

  @OnEvent(GROUP_EVENT.DEBT, OPTS)
  async onDebt(e: GroupDebtEvent): Promise<void> {
    const group = await this.group(e);
    if (!group) return;
    const m = e.manager;
    const debtor = await this.memberByKey(m, group.id, e.debtor);
    const beneficiary = await this.memberByKey(m, group.id, e.beneficiary);
    const round = await this.roundOf(m, group.id, e.round); // ronda ORIGINAL de la deuda
    if (
      await m.existsBy(MemberDebt, {
        originalRoundId: round.id,
        debtorMemberId: debtor.id,
      })
    )
      return;
    await m.insert(MemberDebt, {
      groupId: group.id,
      originalRoundId: round.id,
      debtorMemberId: debtor.id,
      beneficiaryMemberId: beneficiary.id,
      originalAmountStroops: e.amount,
      remainingAmountStroops: e.amount,
      status: DebtStatus.OPEN,
    });
    await m.update(GroupMember, debtor.id, {
      totalDebtStroops: add(debtor.totalDebtStroops, e.amount),
    });
    await m.update(GroupMember, beneficiary.id, {
      shortfallStroops: add(beneficiary.shortfallStroops, e.amount),
    });
  }

  @OnEvent(GROUP_EVENT.PAYOUT, OPTS)
  async onPayout(e: GroupPayoutEvent): Promise<void> {
    const group = await this.group(e);
    if (!group) return;
    const m = e.manager;
    const beneficiary = await this.memberByKey(m, group.id, e.beneficiary);
    const round = await this.roundOf(m, group.id, e.round);
    if (round.isSettled) return;
    await this.markSettled(m, round.id, e, beneficiary.id, e.amount);

    // Cola del contrato tras la liquidación: los saltados (antes del beneficiario) rotan al final.
    const { queue, paid } = await this.loadQueue(m, group.id);
    const idx = queue.findIndex((x) => x.id === beneficiary.id);
    if (idx < 0)
      throw new Error(
        `payout: beneficiario ${beneficiary.id} no está en la cola`,
      );
    const remaining = [...queue.slice(idx + 1), ...queue.slice(0, idx)];
    await m.update(GroupMember, beneficiary.id, { hasReceivedPayout: true });
    await applyQueueOrder(
      m,
      group.id,
      remaining.map((x) => x.id),
      {
        trailingMemberIds: [...paid.map((x) => x.id), beneficiary.id],
      },
    );
    if (remaining.length > 0)
      await this.openRound(m, group, e.round + 1, e.ledgerClosedAt, 0n);
    // Si la cola quedó vacía, el contrato emite `completed` en la misma tx.
  }

  @OnEvent(GROUP_EVENT.NO_BENEFICIARY, OPTS)
  async onNoBeneficiary(e: GroupNoBeneficiaryEvent): Promise<void> {
    const group = await this.group(e);
    if (!group) return;
    const m = e.manager;
    const round = await this.roundOf(m, group.id, e.round);
    if (round.isSettled) return;
    await this.markSettled(m, round.id, e, null, '0');

    const { queue, paid } = await this.loadQueue(m, group.id);
    const rotated = [...queue.slice(1), ...queue.slice(0, 1)]; // rotate_front
    await applyQueueOrder(
      m,
      group.id,
      rotated.map((x) => x.id),
      { trailingMemberIds: paid.map((x) => x.id) },
    );
    await this.openRound(
      m,
      group,
      e.round + 1,
      e.ledgerClosedAt,
      BigInt(e.pool),
    ); // el pozo se acumula
  }

  @OnEvent(GROUP_EVENT.FINAL_PAY, OPTS)
  async onFinalPay(e: GroupFinalPayEvent): Promise<void> {
    const group = await this.group(e);
    if (!group) return;
    const m = e.manager;
    const beneficiary = await this.memberByKey(m, group.id, e.beneficiary);
    const round = await this.roundOf(m, group.id, e.round);
    if (round.isSettled) return;
    await this.markSettled(m, round.id, e, beneficiary.id, e.amount);
    await m.update(GroupMember, beneficiary.id, { hasReceivedPayout: true });
  }

  @OnEvent(GROUP_EVENT.COMPLETED, OPTS)
  async onCompleted(e: GroupCompletedEvent): Promise<void> {
    const group = await this.group(e);
    if (!group) return;
    const m = e.manager;
    const refundable = await m.find(GroupMember, {
      where: { groupId: group.id },
    });
    for (const mem of refundable) {
      if (BigInt(mem.guaranteeBalanceStroops) <= 0n) continue;
      await this.transactions.recordChainTransaction(
        {
          idempotencyKey: `chain:${e.eventId}:${mem.userId}`,
          userId: mem.userId,
          groupId: group.id,
          type: TX_TYPE.GUARANTEE_REFUND,
          amountStroops: mem.guaranteeBalanceStroops,
          stellarTxHash: e.txHash,
          occurredAt: e.ledgerClosedAt,
        },
        m,
      );
    }
    await m.update(PasanakuGroup, group.id, {
      status: GroupStatus.COMPLETED,
      nextDeadline: null,
      graceDeadline: null,
    });
    // close_group devuelve las garantías sobrantes.
    await m.update(
      GroupMember,
      { groupId: group.id },
      { guaranteeBalanceStroops: '0' },
    );
  }

  @OnEvent(GROUP_EVENT.ARREARS, OPTS)
  async onArrears(e: GroupArrearsEvent): Promise<void> {
    const group = await this.group(e);
    if (!group) return;
    const m = e.manager;
    const debtor = await this.memberByKey(m, group.id, e.debtor);
    const round = await this.roundOf(m, group.id, e.round);
    const debt = await m.findOneBy(MemberDebt, {
      originalRoundId: round.id,
      debtorMemberId: debtor.id,
    });
    if (!debt)
      throw new Error(
        `arrears: deuda no encontrada (ronda ${e.round}, ${e.debtor})`,
      );
    const remaining = sub(debt.remainingAmountStroops, e.amount);
    await m.update(MemberDebt, debt.id, {
      remainingAmountStroops: remaining,
      status:
        BigInt(remaining) === 0n
          ? DebtStatus.SETTLED
          : DebtStatus.PARTIALLY_PAID,
      lastPaymentTxHash: e.txHash,
    });
    await m.update(GroupMember, debtor.id, {
      totalDebtStroops: sub(debtor.totalDebtStroops, e.amount),
    });
    const beneficiary = await m.findOneByOrFail(GroupMember, {
      id: debt.beneficiaryMemberId,
    });
    await m.update(GroupMember, beneficiary.id, {
      shortfallStroops: sub(beneficiary.shortfallStroops, e.amount),
    });
  }

  // ──────────────────────────── Helpers ─────────────────────────────

  private async group(e: BaseGroupEvent): Promise<PasanakuGroup | null> {
    const g = await e.manager.findOneBy(PasanakuGroup, {
      contractAddress: e.contractId,
    });
    if (!g)
      this.logger.warn(
        `Evento ${e.eventId}: contrato ${e.contractId} sin grupo en BD; se ignora`,
      );
    return g;
  }

  private async memberByKey(
    m: EntityManager,
    groupId: string,
    publicKey: string,
  ): Promise<GroupMember> {
    const member = await m
      .createQueryBuilder(GroupMember, 'm')
      .innerJoin('m.user', 'u')
      .where('m.groupId = :groupId', { groupId })
      .andWhere('u.stellarPublicKey = :publicKey', { publicKey })
      .getOne();
    if (!member)
      throw new Error(
        `Miembro ${publicKey} no encontrado en el grupo ${groupId}`,
      );
    return member;
  }

  private async roundOf(
    m: EntityManager,
    groupId: string,
    roundNumber: number,
  ): Promise<Round> {
    const r = await m.findOneBy(Round, { groupId, roundNumber });
    if (!r)
      throw new Error(
        `Ronda ${roundNumber} no encontrada en el grupo ${groupId}`,
      );
    return r;
  }

  private async paymentOf(
    m: EntityManager,
    roundId: string,
    memberId: string,
  ): Promise<RoundPayment> {
    const p = await m.findOneBy(RoundPayment, { roundId, memberId });
    if (!p)
      throw new Error(
        `RoundPayment no encontrado (ronda ${roundId}, miembro ${memberId})`,
      );
    return p;
  }

  private async loadQueue(m: EntityManager, groupId: string) {
    const all = await m.find(GroupMember, {
      where: { groupId },
      order: { currentQueuePosition: 'ASC' },
    });
    return {
      queue: all.filter((x) => !x.hasReceivedPayout),
      paid: all.filter((x) => x.hasReceivedPayout),
    };
  }

  private async markSettled(
    m: EntityManager,
    roundId: string,
    e: BaseGroupEvent,
    beneficiaryMemberId: string | null,
    payout: string,
  ): Promise<void> {
    await m.update(Round, roundId, {
      isSettled: true,
      beneficiaryMemberId,
      actualPayoutStroops: payout,
      settleTxHash: e.txHash,
      settledAt: e.ledgerClosedAt,
    });
  }

  /** Plazos = ledgerClosedAt de la tx que abre la ronda + duración (igual que advance_round del contrato). */
  private async openRound(
    m: EntityManager,
    group: PasanakuGroup,
    roundNumber: number,
    openedAt: Date,
    carriedPool: bigint,
  ): Promise<void> {
    if (await m.existsBy(Round, { groupId: group.id, roundNumber })) return;
    const members = await m.find(GroupMember, {
      where: { groupId: group.id },
      select: { id: true },
    });
    const deadline = new Date(
      openedAt.getTime() + group.roundDurationSeconds * 1000,
    );
    const graceEnd = new Date(
      deadline.getTime() + group.graceDurationSeconds * 1000,
    );
    const expected =
      carriedPool + BigInt(group.contributionStroops) * BigInt(members.length);
    const round = await m.save(
      m.create(Round, {
        groupId: group.id,
        roundNumber,
        deadline,
        graceEnd,
        expectedPoolStroops: expected.toString(),
      }),
    );
    await m.insert(
      RoundPayment,
      members.map((x) => ({ roundId: round.id, memberId: x.id })),
    );
    await m.update(PasanakuGroup, group.id, {
      currentRound: roundNumber,
      nextDeadline: deadline,
      graceDeadline: graceEnd,
    });
  }
}
