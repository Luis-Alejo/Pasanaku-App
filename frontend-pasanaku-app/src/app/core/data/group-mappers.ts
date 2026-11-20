import type {
  Asset,
  Contribution,
  ContributionStatus,
  Group,
  GroupStatus,
  Member,
  Round,
} from '@core/models/domain.models';
import type {
  GroupDetailFieldsFragment,
  GroupPreviewFieldsFragment,
  GroupSummaryFieldsFragment,
  RoundPaymentStatus,
} from '@gql';

/** El contrato trabaja solo en USDC (Stellar usa 7 decimales). */
export const USDC_ASSET: Asset = { code: 'USDC', decimals: 7 };

const STROOPS_DECIMALS = 7;

/** "50000000" → "5.0000000". */
export function stroopsToAmount(stroops: string): string {
  const digits = stroops.padStart(STROOPS_DECIMALS + 1, '0');
  const cut = digits.length - STROOPS_DECIMALS;
  return `${digits.slice(0, cut)}.${digits.slice(cut)}`;
}

type BackendGroup = GroupSummaryFieldsFragment | GroupDetailFieldsFragment | GroupPreviewFieldsFragment;

/** Menos de un día por ronda: es un grupo de demostración. */
const DAY_SECONDS = 86_400;

function toStatus(group: BackendGroup, memberCount: number): GroupStatus {
  switch (group.status) {
    case 'OPEN':
      return memberCount >= group.maxParticipants ? 'ASSIGNING_TURNS' : 'FORMING';
    case 'ACTIVE':
      return 'ACTIVE';
    default:
      return 'COMPLETED';
  }
}

function baseGroup(group: BackendGroup, members: Member[]): Group {
  return {
    id: group.id,
    name: group.name,
    contributionAmount: stroopsToAmount(group.contributionStroops),
    asset: USDC_ASSET,
    periodicity: group.frequency,
    memberCount: group.maxParticipants,
    visibility: group.isPublic ? 'PUBLIC' : 'PRIVATE',
    // El backend no guarda un modo: el organizador define el orden.
    turnMode: 'AGREEMENT',
    turnsByOrganizer: true,
    organizerUserId: group.creatorId,
    status: toStatus(group, group.memberCount),
    // En los privados, el id del grupo funciona como enlace de invitación.
    inviteCode: group.isPublic ? undefined : group.id,
    members,
    rounds: [],
    currentRound: null,
    createdAt: group.createdAt,
    demoRoundSeconds: group.roundDurationSeconds < DAY_SECONDS ? group.roundDurationSeconds : undefined,
    cancelled: group.status === 'CANCELLED' || undefined,
  };
}

/** Quien no es miembro solo conoce el resumen: los cupos ocupados no tienen nombre. */
export function groupFromSummary(group: GroupSummaryFieldsFragment | GroupPreviewFieldsFragment): Group {
  const members = Array.from({ length: group.memberCount }, (_, i): Member => ({
    id: `slot-${i + 1}`,
    userId: '',
    displayName: '',
    walletAddress: '',
    turnNumber: null,
    joinedAt: group.createdAt,
  }));
  const invited = 'isInvited' in group && group.isInvited ? true : undefined;
  return { ...baseGroup(group, members), detailsHidden: true, invited };
}

/** Enlace a un grupo privado que todavía no se puede consultar. */
export function hiddenPrivateGroup(id: string): Group {
  return {
    id,
    name: 'Grupo privado',
    contributionAmount: '0',
    asset: USDC_ASSET,
    periodicity: 'MONTHLY',
    memberCount: 0,
    visibility: 'PRIVATE',
    turnMode: 'AGREEMENT',
    turnsByOrganizer: true,
    status: 'FORMING',
    members: [],
    rounds: [],
    currentRound: null,
    createdAt: '',
    detailsHidden: true,
  };
}

function toRounds(group: GroupDetailFieldsFragment): Round[] {
  const started = [...group.rounds].sort((a, b) => a.roundNumber - b.roundNumber);
  const last = started.at(-1);
  if (!last) {
    return [];
  }
  // Las rondas se crean de a una: las siguientes se proyectan con la cola de cobro.
  const queue = group.members
    .filter((m) => !m.hasReceivedPayout)
    .sort((a, b) => a.currentQueuePosition - b.currentQueuePosition);
  let next = 0;
  const rounds: Round[] = [];
  for (let number = 1; number <= group.maxParticipants; number++) {
    const round = started.find((r) => r.roundNumber === number);
    const deadline =
      round?.deadline ??
      new Date(
        new Date(last.deadline).getTime() + (number - last.roundNumber) * group.roundDurationSeconds * 1000,
      ).toISOString();
    const recipient = round?.isSettled ? round.beneficiaryMemberId : queue[next++]?.id;
    rounds.push({
      number,
      dueDate: deadline.slice(0, 10),
      recipientMemberId: recipient ?? '',
      status: round?.isSettled ? 'PAID_OUT' : number === group.currentRound ? 'OPEN' : 'UPCOMING',
      payoutTxHash: round?.settleTxHash ?? undefined,
      paidOutAt: round?.settledAt ?? undefined,
    });
  }
  return rounds;
}

export function groupFromDetail(group: GroupDetailFieldsFragment): Group {
  const open = group.status === 'OPEN';
  const members = group.members.map((m): Member => ({
    id: m.id,
    userId: m.userId,
    displayName: m.fullName,
    reputation: m.reputationScore,
    walletAddress: '',
    // Mientras el grupo no empieza, el backend solo guarda el orden de llegada.
    turnNumber: open ? null : m.initialTurnOrder,
    joinedAt: m.joinedAt,
  }));
  const first = group.rounds.find((r) => r.roundNumber === 1);
  const roundNumberById = new Map(group.rounds.map((r) => [r.id, r.roundNumber]));
  return {
    ...baseGroup(group, members),
    status: toStatus(group, group.members.length),
    rounds: toRounds(group),
    currentRound: group.status === 'ACTIVE' && group.currentRound > 0 ? group.currentRound : null,
    debts: group.debts.map((d) => ({
      id: d.id,
      roundNumber: roundNumberById.get(d.originalRoundId) ?? 0,
      debtorMemberId: d.debtorMemberId,
      beneficiaryMemberId: d.beneficiaryMemberId,
      original: stroopsToAmount(d.originalAmountStroops),
      remaining: stroopsToAmount(d.remainingAmountStroops),
      settled: d.status === 'SETTLED',
      lastTxHash: d.lastPaymentTxHash ?? undefined,
    })),
    turnsAssignedAt: first
      ? new Date(new Date(first.deadline).getTime() - group.roundDurationSeconds * 1000).toISOString()
      : undefined,
  };
}

const PAID_STATUSES: RoundPaymentStatus[] = ['PAID', 'PAID_IN_GRACE', 'EXEMPT'];

function toContributionStatus(status: RoundPaymentStatus, deadline: string, now: Date): ContributionStatus {
  if (PAID_STATUSES.includes(status)) {
    return 'PAID';
  }
  return status === 'PENDING' && new Date(deadline) >= now ? 'PENDING' : 'LATE';
}

/** Aportes del grupo. `txHashOf` da el hash si este dispositivo lo conoce. */
export function contributionsFromDetail(
  group: GroupDetailFieldsFragment,
  txHashOf: (roundNumber: number, memberId: string) => string | undefined = () => undefined,
  now = new Date(),
): Contribution[] {
  return group.rounds.flatMap((round) =>
    round.payments.map((payment) => ({
      id: payment.id,
      groupId: group.id,
      memberId: payment.memberId,
      roundNumber: round.roundNumber,
      amount: stroopsToAmount(group.contributionStroops),
      status: toContributionStatus(payment.status, round.deadline, now),
      paidAt: payment.paidAt ?? undefined,
      txHash: payment.txHash ?? txHashOf(round.roundNumber, payment.memberId),
    })),
  );
}
