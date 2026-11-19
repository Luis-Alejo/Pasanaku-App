import { isSwappable } from '@core/data/group-rules';
import type {
  Contribution,
  ContributionStatus,
  Group,
  GroupStatus,
  GroupVisibility,
  Member,
  Periodicity,
  TurnMode,
  TurnSwap,
  TurnSwapStatus,
} from '@core/models/domain.models';
import type { TimelineStep } from '@shared/ui/turn-timeline/turn-timeline.component';
import { formatDate, multiplyAmount, plural, sumAmounts } from '@shared/utils/format';

/**
 * Funciones puras que convierten los datos del dominio en lo que muestran las
 * pantallas de grupos. Sin estado ni servicios: fáciles de probar.
 */

export const STATUS_LABELS: Record<GroupStatus, string> = {
  FORMING: 'Sumando miembros',
  ASSIGNING_TURNS: 'Asignando turnos',
  ACTIVE: 'En curso',
  COMPLETED: 'Cerrado',
};

export const PERIODICITY_LABELS: Record<Periodicity, string> = {
  WEEKLY: 'Semanal',
  BIWEEKLY: 'Quincenal',
  MONTHLY: 'Mensual',
};

export const TURN_MODE_LABELS: Record<TurnMode, string> = {
  AGREEMENT: 'Por acuerdo',
  DRAW: 'Por sorteo',
};

export const VISIBILITY_LABELS: Record<GroupVisibility, string> = {
  PUBLIC: 'Público',
  PRIVATE: 'Privado',
};

/** Orden de "Mis grupos": primero los que están en curso, al final los cerrados. */
const STATUS_ORDER: Record<GroupStatus, number> = { ACTIVE: 0, ASSIGNING_TURNS: 1, FORMING: 2, COMPLETED: 3 };

export function sortMyGroups(groups: Group[]): Group[] {
  return [...groups].sort((a, b) => STATUS_ORDER[a.status] - STATUS_ORDER[b.status] || a.name.localeCompare(b.name));
}

/** Cómo se decide el orden de cobro de este grupo. */
export function turnModeLabel(group: Group): string {
  return group.turnsByOrganizer ? 'Lo define el organizador' : TURN_MODE_LABELS[group.turnMode];
}

export function membersLabel(group: Group): string {
  return `${group.members.length} de ${group.memberCount} ${plural(group.memberCount, 'miembro', 'miembros')}`;
}

/** Miembro del usuario en el grupo, si es parte de él. */
export function myMember(group: Group, userId: string): Member | undefined {
  return group.members.find((m) => m.userId === userId);
}

/** Texto corto del momento del grupo para la tarjeta de la lista. */
export function groupProgressLabel(group: Group, userId: string): string {
  switch (group.status) {
    case 'FORMING': {
      const free = group.memberCount - group.members.length;
      return free > 0 ? `${free} ${plural(free, 'cupo libre', 'cupos libres')}` : 'Grupo completo';
    }
    case 'ASSIGNING_TURNS':
      if (group.turnsByOrganizer) return 'Definiendo los turnos';
      return group.turnMode === 'DRAW' ? 'Esperando el sorteo' : 'Eligiendo turnos';
    case 'ACTIVE': {
      const round = `Ronda ${group.currentRound} de ${group.rounds.length}`;
      const mine = myMember(group, userId);
      const myRound = mine && group.rounds.find((r) => r.recipientMemberId === mine.id);
      if (!myRound || myRound.status === 'PAID_OUT') {
        return round;
      }
      return myRound.status === 'OPEN'
        ? `${round} · ¡Cobras en esta ronda!`
        : `${round} · Tu cobro: ${formatDate(myRound.dueDate)}`;
    }
    case 'COMPLETED':
      return `${group.rounds.length} ${plural(group.rounds.length, 'ronda completada', 'rondas completadas')}`;
  }
}

export interface RoundFund {
  roundNumber: number;
  /** Total aportado (pagado) en la ronda. */
  collected: string;
  /** Lo que se junta cuando todos aportan (lo que cobra el del turno). */
  target: string;
  paidCount: number;
  memberCount: number;
  dueDate: string;
}

/** Fondo de la ronda en curso, o null si el grupo no está en una ronda. */
export function currentRoundFund(group: Group, contributions: Contribution[]): RoundFund | null {
  const round = group.rounds.find((r) => r.number === group.currentRound);
  if (!round) {
    return null;
  }
  const paid = contributions.filter(
    (c) => c.groupId === group.id && c.roundNumber === round.number && c.status === 'PAID',
  );
  return {
    roundNumber: round.number,
    collected: sumAmounts(
      paid.map((c) => c.amount),
      group.asset.decimals,
    ),
    target: multiplyAmount(group.contributionAmount, group.memberCount, group.asset.decimals),
    paidCount: paid.length,
    memberCount: group.memberCount,
    dueDate: round.dueDate,
  };
}

export interface MemberPayment {
  member: Member;
  status: ContributionStatus;
  isMe: boolean;
}

/** Estado del aporte de cada miembro en una ronda, en orden de turno. */
export function roundPayments(
  group: Group,
  contributions: Contribution[],
  roundNumber: number,
  userId: string,
): MemberPayment[] {
  return sortByTurn(group.members).map((member) => ({
    member,
    // Sin registro de aporte todavía = pendiente.
    status:
      contributions.find((c) => c.groupId === group.id && c.roundNumber === roundNumber && c.memberId === member.id)
        ?.status ?? 'PENDING',
    isMe: member.userId === userId,
  }));
}

export function sortByTurn(members: Member[]): Member[] {
  return [...members].sort(
    (a, b) => (a.turnNumber ?? Infinity) - (b.turnNumber ?? Infinity) || a.joinedAt.localeCompare(b.joinedAt),
  );
}

/** Línea de turnos: quién cobra en cada ronda y en qué fecha. */
export function turnSteps(group: Group, userId: string): TimelineStep[] {
  return [...group.rounds]
    .sort((a, b) => a.number - b.number)
    .map((round) => {
      const member = group.members.find((m) => m.id === round.recipientMemberId);
      const isMe = member?.userId === userId;
      const when =
        round.status === 'PAID_OUT'
          ? `Cobró el ${formatDate(round.paidOutAt ?? round.dueDate)}`
          : formatDate(round.dueDate, true);
      return {
        id: String(round.number),
        title: member?.displayName ?? 'Miembro no disponible',
        subtitle: `Ronda ${round.number} · ${when}`,
        state: round.status === 'PAID_OUT' ? 'done' : round.status === 'OPEN' ? 'current' : 'upcoming',
        highlight: isMe,
        avatarName: member?.displayName,
      };
    });
}

// ---------------------------------------------------------------------------
// Turnos
// ---------------------------------------------------------------------------

export { isSwappable };

export interface TurnSlot {
  turn: number;
  /** Quién eligió este turno (null si está libre). */
  member: Member | null;
  isMine: boolean;
}

/** Los turnos 1..n del grupo y quién tiene cada uno (modo acuerdo, mientras se eligen). */
export function turnSlots(group: Group, userId: string): TurnSlot[] {
  return Array.from({ length: group.memberCount }, (_, i) => {
    const turn = i + 1;
    const member = group.members.find((m) => m.turnNumber === turn) ?? null;
    return { turn, member, isMine: member?.userId === userId };
  });
}

/** Miembros con los que el usuario puede proponer un intercambio ahora. */
export function swapCandidates(group: Group, swaps: TurnSwap[], userId: string): Member[] {
  const me = myMember(group, userId);
  if (!me || group.turnMode !== 'AGREEMENT' || !isSwappable(group, me.turnNumber)) {
    return [];
  }
  const pendingWith = new Set(
    swaps
      .filter((s) => s.status === 'PROPOSED' && (s.fromMemberId === me.id || s.toMemberId === me.id))
      .map((s) => (s.fromMemberId === me.id ? s.toMemberId : s.fromMemberId)),
  );
  return sortByTurn(group.members).filter(
    (m) => m.id !== me.id && isSwappable(group, m.turnNumber) && !pendingWith.has(m.id),
  );
}

export interface SwapView {
  id: string;
  /** Para el usuario: le llegó, la mandó, o es entre otros miembros. */
  direction: 'incoming' | 'outgoing' | 'other';
  status: TurnSwapStatus;
  text: string;
  date: string;
}

const SWAP_STATUS_TEXT: Record<TurnSwapStatus, string> = {
  PROPOSED: 'Pendiente',
  ACCEPTED: 'Aceptado',
  REJECTED: 'Rechazado',
};

export function swapStatusLabel(status: TurnSwapStatus): string {
  return SWAP_STATUS_TEXT[status];
}

/** Texto de una propuesta de intercambio, contado desde el punto de vista del usuario. */
export function describeSwap(swap: TurnSwap, group: Group, userId: string): SwapView {
  const name = (id: string) => group.members.find((m) => m.id === id)?.displayName ?? 'Un miembro';
  const me = myMember(group, userId);
  const direction = swap.toMemberId === me?.id ? 'incoming' : swap.fromMemberId === me?.id ? 'outgoing' : 'other';
  let text: string;
  if (direction === 'incoming') {
    const verb = swap.status === 'PROPOSED' ? 'te propone' : 'te propuso';
    text = `${name(swap.fromMemberId)} ${verb} su turno ${swap.fromTurn} a cambio de tu turno ${swap.toTurn}.`;
  } else if (direction === 'outgoing') {
    text = `Propusiste a ${name(swap.toMemberId)} cambiar tu turno ${swap.fromTurn} por su turno ${swap.toTurn}.`;
  } else {
    text = `${name(swap.fromMemberId)} (turno ${swap.fromTurn}) y ${name(swap.toMemberId)} (turno ${swap.toTurn}).`;
  }
  return {
    id: swap.id,
    direction,
    status: swap.status,
    text,
    date: formatDate(swap.respondedAt ?? swap.createdAt),
  };
}

/** Propuestas que esperan la respuesta del usuario. */
export function incomingProposals(group: Group, swaps: TurnSwap[], userId: string): TurnSwap[] {
  const me = myMember(group, userId);
  return me ? swaps.filter((s) => s.status === 'PROPOSED' && s.toMemberId === me.id) : [];
}

// ---------------------------------------------------------------------------
// Historial
// ---------------------------------------------------------------------------

export type HistoryKind = 'contribution' | 'payout' | 'swap' | 'start' | 'created';

export interface HistoryEvent {
  id: string;
  kind: HistoryKind;
  /** ISO, para ordenar. */
  at: string;
  title: string;
  detail?: string;
  /** Monto del movimiento (aportes y cobros). */
  amount?: string;
  txHash?: string;
  isMine: boolean;
}

/**
 * Línea de tiempo del grupo, del más reciente al más antiguo: aportes, cobros,
 * intercambios aceptados y cuándo se definió el orden.
 */
export function historyEvents(
  group: Group,
  contributions: Contribution[],
  swaps: TurnSwap[],
  userId: string,
): HistoryEvent[] {
  const member = (id: string) => group.members.find((m) => m.id === id);
  const name = (id: string) => member(id)?.displayName ?? 'Un miembro';
  const mine = (id: string) => member(id)?.userId === userId;
  const payout = multiplyAmount(group.contributionAmount, group.memberCount, group.asset.decimals);
  const events: HistoryEvent[] = [];

  for (const c of contributions) {
    if (c.groupId === group.id && c.status === 'PAID' && c.paidAt) {
      events.push({
        id: `c-${c.id}`,
        kind: 'contribution',
        at: c.paidAt,
        title: mine(c.memberId) ? 'Aportaste' : `${name(c.memberId)} aportó`,
        detail: `Ronda ${c.roundNumber}`,
        amount: c.amount,
        txHash: c.txHash,
        isMine: mine(c.memberId),
      });
    }
  }
  for (const r of group.rounds) {
    if (r.status === 'PAID_OUT') {
      events.push({
        id: `p-${r.number}`,
        kind: 'payout',
        at: r.paidOutAt ?? `${r.dueDate}T23:59:59Z`,
        title: mine(r.recipientMemberId) ? 'Cobraste' : `${name(r.recipientMemberId)} cobró`,
        detail: `Desembolso de la ronda ${r.number}`,
        amount: payout,
        txHash: r.payoutTxHash,
        isMine: mine(r.recipientMemberId),
      });
    }
  }
  for (const s of swaps) {
    if (s.groupId === group.id && s.status === 'ACCEPTED') {
      events.push({
        id: `s-${s.id}`,
        kind: 'swap',
        at: s.respondedAt ?? s.createdAt,
        title: 'Intercambio de turnos',
        detail: `${name(s.fromMemberId)} pasó al turno ${s.toTurn} y ${name(s.toMemberId)} al turno ${s.fromTurn}`,
        isMine: mine(s.fromMemberId) || mine(s.toMemberId),
      });
    }
  }
  if (group.turnsAssignedAt) {
    events.push({
      id: 'start',
      kind: 'start',
      at: group.turnsAssignedAt,
      title: group.turnMode === 'DRAW' ? 'Se sorteó el orden de cobro' : 'Quedó definido el orden de cobro',
      isMine: false,
    });
  }
  events.push({ id: 'created', kind: 'created', at: group.createdAt, title: 'Se creó el grupo', isMine: false });

  // A igual hora, el desembolso va después del aporte que lo provocó (se muestra primero).
  const sameTimeOrder: Record<HistoryKind, number> = { payout: 0, contribution: 1, swap: 2, start: 3, created: 4 };
  return events.sort((a, b) => b.at.localeCompare(a.at) || sameTimeOrder[a.kind] - sameTimeOrder[b.kind]);
}
