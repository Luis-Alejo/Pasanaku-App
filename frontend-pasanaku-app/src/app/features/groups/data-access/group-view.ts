import type {
  Contribution,
  ContributionStatus,
  Group,
  GroupStatus,
  GroupVisibility,
  Member,
  Periodicity,
  TurnMode,
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
      };
    });
}
