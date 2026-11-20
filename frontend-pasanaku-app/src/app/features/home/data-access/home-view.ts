import type { Contribution, ContributionStatus, Group, Round, TurnSwap } from '@core/models/domain.models';
import { multiplyAmount } from '@shared/utils/format';

/**
 * Resumen de Inicio: funciones puras sobre los grupos del usuario.
 * (Inicio solo lee; las acciones viven en la feature de grupos.)
 */

export interface PendingPayment {
  group: Group;
  round: Round;
  status: Exclude<ContributionStatus, 'PAID'>;
}

export interface UpcomingPayout {
  group: Group;
  round: Round;
  /** Lo que recibe: aporte × miembros. */
  amount: string;
  /** Cobra en la ronda que está en curso. */
  isCurrent: boolean;
}

export type TodoKind = 'swap' | 'choose-turn' | 'draw' | 'invite' | 'debt';

export interface Todo {
  kind: TodoKind;
  group: Group;
  text: string;
  /** Ruta a la pantalla donde se resuelve. */
  link: string[];
}

const memberOf = (group: Group, userId: string) => group.members.find((m) => m.userId === userId);

/** Aportes que el usuario debe en las rondas en curso: atrasados primero, luego por fecha. */
export function pendingPayments(
  groups: Group[],
  contributionsByGroup: Record<string, Contribution[]>,
  userId: string,
  today: string,
): PendingPayment[] {
  const result: PendingPayment[] = [];
  for (const group of groups) {
    const me = memberOf(group, userId);
    const round = group.rounds.find((r) => r.number === group.currentRound);
    if (!me || group.status !== 'ACTIVE' || !round) continue;
    const mine = (contributionsByGroup[group.id] ?? []).find(
      (c) => c.roundNumber === round.number && c.memberId === me.id,
    );
    if (mine?.status === 'PAID') continue;
    const late = mine?.status === 'LATE' || round.dueDate < today;
    result.push({ group, round, status: late ? 'LATE' : 'PENDING' });
  }
  return result.sort(
    (a, b) =>
      Number(b.status === 'LATE') - Number(a.status === 'LATE') || a.round.dueDate.localeCompare(b.round.dueDate),
  );
}

/** El próximo cobro del usuario (el más cercano entre sus grupos en curso). */
export function nextPayout(groups: Group[], userId: string): UpcomingPayout | null {
  const candidates: UpcomingPayout[] = [];
  for (const group of groups) {
    const me = memberOf(group, userId);
    if (!me || group.status !== 'ACTIVE') continue;
    const round = group.rounds.find((r) => r.recipientMemberId === me.id && r.status !== 'PAID_OUT');
    if (round) {
      candidates.push({
        group,
        round,
        amount: multiplyAmount(group.contributionAmount, group.memberCount, group.asset.decimals),
        isCurrent: round.status === 'OPEN',
      });
    }
  }
  return candidates.sort((a, b) => a.round.dueDate.localeCompare(b.round.dueDate))[0] ?? null;
}

/** Lo que espera una acción del usuario: propuestas de intercambio, elegir turno o sortear. */
export function todos(
  groups: Group[],
  swapsByGroup: Record<string, TurnSwap[]>,
  userId: string,
  invitations: Group[] = [],
): Todo[] {
  const list: Todo[] = invitations.map((group) => ({
    kind: 'invite' as const,
    group,
    text: 'Te invitaron a un grupo',
    link: ['/tabs/groups', group.id],
  }));
  for (const group of groups) {
    const me = memberOf(group, userId);
    if (!me) continue;
    const owed = (group.debts ?? []).filter((d) => !d.settled && d.debtorMemberId === me.id);
    if (owed.length) {
      list.push({
        kind: 'debt',
        group,
        text: owed.length === 1 ? 'Tienes un aporte atrasado' : `Tienes ${owed.length} aportes atrasados`,
        link: ['/tabs/groups', group.id],
      });
    }
    const incoming = (swapsByGroup[group.id] ?? []).filter((s) => s.status === 'PROPOSED' && s.toMemberId === me.id);
    if (incoming.length) {
      list.push({
        kind: 'swap',
        group,
        text:
          incoming.length === 1
            ? 'Tienes una propuesta de intercambio de turno'
            : `Tienes ${incoming.length} propuestas de intercambio de turno`,
        link: ['/tabs/groups', group.id, 'turns'],
      });
    }
    if (group.status === 'ASSIGNING_TURNS') {
      if (group.turnMode === 'DRAW') {
        list.push({
          kind: 'draw',
          group,
          text: 'Falta sortear el orden de cobro',
          link: ['/tabs/groups', group.id, 'turns'],
        });
      } else if (me.turnNumber === null) {
        list.push({ kind: 'choose-turn', group, text: 'Elige tu turno', link: ['/tabs/groups', group.id, 'turns'] });
      }
    }
  }
  return list;
}

/** Grupos en curso, ordenados por nombre. */
export function activeGroups(groups: Group[]): Group[] {
  return groups.filter((g) => g.status === 'ACTIVE').sort((a, b) => a.name.localeCompare(b.name));
}

const ONGOING_ORDER: Record<string, number> = { ACTIVE: 0, ASSIGNING_TURNS: 1, FORMING: 2 };

/** Grupos que todavía no terminaron: primero los que están en curso. */
export function ongoingGroups(groups: Group[]): Group[] {
  return groups
    .filter((g) => g.status !== 'COMPLETED')
    .sort((a, b) => ONGOING_ORDER[a.status] - ONGOING_ORDER[b.status] || a.name.localeCompare(b.name));
}

/** Grupos que ya cerraron (sin los cancelados), del más reciente al más antiguo. */
export function finishedGroups(groups: Group[]): Group[] {
  return groups
    .filter((g) => g.status === 'COMPLETED' && !g.cancelled)
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

/** En qué va el grupo, en pocas palabras. */
export function groupStatusText(group: Group): string {
  switch (group.status) {
    case 'FORMING': {
      const missing = group.memberCount - group.members.length;
      return `${group.members.length} de ${group.memberCount} miembros · ${missing === 1 ? 'falta 1' : `faltan ${missing}`}`;
    }
    case 'ASSIGNING_TURNS':
      return 'Grupo completo · definiendo turnos';
    case 'ACTIVE':
      return `Ronda ${group.currentRound} de ${group.rounds.length}`;
    default:
      return 'Cerrado';
  }
}

/** Primer nombre para el saludo ("Ana Quispe Mamani" → "Ana"). */
export function firstName(displayName: string): string {
  return displayName.trim().split(/\s+/)[0] ?? '';
}
