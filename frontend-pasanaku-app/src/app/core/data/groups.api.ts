import { Injectable } from '@angular/core';
import { MOCK_ASSETS, MOCK_CONTRIBUTIONS, MOCK_GROUPS, MOCK_TURN_SWAPS } from '@core/data/groups.mock';
import type {
  Asset,
  ContributeResult,
  Contribution,
  CreateGroupInput,
  Group,
  Payout,
  Round,
  TurnSwap,
  User,
} from '@core/models/domain.models';
import { ContributionError, JoinGroupError, TurnError } from '@core/models/domain.models';
import { environment } from '@env/environment';
import { addDays, addMonths, todayIso } from '@shared/utils/date';
import { multiplyAmount } from '@shared/utils/format';

import { isSwappable } from './group-rules';

/**
 * De dónde salen los datos de grupos. El store solo conoce esta interfaz:
 * hoy se usa la versión mock; en el paso 9 se agrega la de GraphQL y se elige
 * con `environment.useMocks`, sin tocar el store ni las pantallas.
 */
@Injectable({ providedIn: 'root', useFactory: createGroupsApi })
export abstract class GroupsApi {
  /** Grupos donde el usuario es miembro. */
  abstract getMyGroups(userId: string): Promise<Group[]>;
  /** Grupos públicos que todavía aceptan miembros (y donde el usuario no está). */
  abstract getPublicGroups(userId: string): Promise<Group[]>;
  /** Un grupo por id, o null si no existe. */
  abstract getGroup(id: string): Promise<Group | null>;
  /** Un grupo por su código de invitación (sin distinguir mayúsculas), o null. */
  abstract getGroupByCode(code: string): Promise<Group | null>;
  /** Aportes de un grupo (todas las rondas). */
  abstract getContributions(groupId: string): Promise<Contribution[]>;
  /** Monedas disponibles para los aportes (código y decimales vienen de aquí). */
  abstract getAssets(): Promise<Asset[]>;
  /** Crea un grupo con el usuario como primer miembro. */
  abstract createGroup(input: CreateGroupInput, user: User): Promise<Group>;
  /** Une al usuario al grupo. Falla con `JoinGroupError` si no se puede. */
  abstract joinGroup(groupId: string, user: User): Promise<Group>;

  // --- Turnos (fallan con `TurnError` si no se puede)
  /** Propuestas de intercambio de turno del grupo. */
  abstract getTurnSwaps(groupId: string): Promise<TurnSwap[]>;
  /** Modo acuerdo: el usuario elige (o cambia) su turno. Si ya eligieron todos, el grupo empieza. */
  abstract chooseTurn(groupId: string, userId: string, turnNumber: number): Promise<Group>;
  /**
   * Modo sorteo: asigna el orden al azar y el grupo empieza.
   * POR CONFIRMAR con el contrato: quién puede disparar el sorteo.
   */
  abstract runDraw(groupId: string, userId: string): Promise<Group>;
  /** Modo acuerdo: el usuario propone a otro miembro cambiar sus turnos. */
  abstract proposeSwap(groupId: string, userId: string, toMemberId: string): Promise<TurnSwap>;
  /** El miembro que recibió la propuesta la acepta o la rechaza. */
  abstract respondSwap(swapId: string, userId: string, accept: boolean): Promise<TurnSwap>;

  // --- Aportes (fallan con `ContributionError` si no se puede)
  /**
   * Registra el aporte del usuario en la ronda en curso. Si con él aportaron todos,
   * se hace el desembolso (simulado en el MVP) y se abre la ronda siguiente.
   * Backend (decidido): mutation `payRound(groupId)`; el backend firma con la clave
   * custodiada del usuario y paga la comisión (fee bump). Tarda 3–5 s en Stellar.
   * POR REVISAR en el paso 9: `payArrears(groupId, round, amount)` para deudas de
   * rondas anteriores (en este mock una ronda no se cierra hasta que paguen todos).
   */
  abstract contribute(groupId: string, userId: string): Promise<ContributeResult>;
}

function createGroupsApi(): GroupsApi {
  if (environment.useMocks) {
    return new MockGroupsApi();
  }
  // Paso 9: devolver aquí la implementación GraphQL.
  throw new Error('GroupsApi: falta la implementación GraphQL (paso 9). Activa useMocks.');
}

/** Demora simulada para que los estados de carga se vean como con la API real. */
const MOCK_DELAY_MS = 300;

/** Una transacción en Stellar tarda 3–5 s en confirmarse; el mock imita esa espera. */
const STELLAR_TX_DELAY_MS = 3000;

function delay<T>(value: T, ms = MOCK_DELAY_MS): Promise<T> {
  // structuredClone: las pantallas nunca reciben (ni modifican) los objetos del mock.
  return new Promise((resolve) => setTimeout(() => resolve(structuredClone(value)), ms));
}

function fail(error: Error): Promise<never> {
  return new Promise((_, reject) => setTimeout(() => reject(error), MOCK_DELAY_MS));
}

const isMember = (group: Group, userId: string) => group.members.some((m) => m.userId === userId);

/** Hash de transacción simulado (64 caracteres hex), como los que devuelve Stellar. */
function randomTxHash(): string {
  return Array.from(crypto.getRandomValues(new Uint8Array(32)), (b) => b.toString(16).padStart(2, '0')).join('');
}

/** Con el orden definido, el grupo empieza: se crean las rondas y se abre la primera. */
function startCycle(group: Group, today = todayIso()): void {
  const next = (n: number) => (group.periodicity === 'BIWEEKLY' ? addDays(today, 14 * n) : addMonths(today, n));
  group.rounds = [...group.members]
    .sort((a, b) => (a.turnNumber ?? 0) - (b.turnNumber ?? 0))
    .map((m, i): Round => ({
      number: i + 1,
      dueDate: next(i + 1),
      recipientMemberId: m.id,
      status: i === 0 ? 'OPEN' : 'UPCOMING',
    }));
  group.status = 'ACTIVE';
  group.currentRound = 1;
  group.turnsAssignedAt = new Date().toISOString();
}

/** Sin 0/O ni 1/I/L, para que el código se pueda dictar sin confusiones. */
const CODE_ALPHABET = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';

/**
 * Implementación en memoria: los grupos creados y las uniones duran hasta
 * recargar la página. Es una sola instancia para toda la app (providedIn root).
 */
export class MockGroupsApi extends GroupsApi {
  private readonly groups: Group[] = structuredClone(MOCK_GROUPS);
  private readonly contributions: Contribution[] = structuredClone(MOCK_CONTRIBUTIONS);
  private readonly assets: Asset[] = Object.values(MOCK_ASSETS);
  private readonly swaps: TurnSwap[] = structuredClone(MOCK_TURN_SWAPS);
  private nextId = 1;

  /** @param txDelayMs espera simulada de una transacción en Stellar (0 en las pruebas). */
  constructor(private readonly txDelayMs = STELLAR_TX_DELAY_MS) {
    super();
  }

  contribute(groupId: string, userId: string): Promise<ContributeResult> {
    const group = this.groups.find((g) => g.id === groupId);
    if (!group) return fail(new ContributionError('NOT_FOUND'));
    const me = group.members.find((m) => m.userId === userId);
    if (!me) return fail(new ContributionError('NOT_MEMBER'));
    const round = group.rounds.find((r) => r.number === group.currentRound);
    if (group.status !== 'ACTIVE' || !round) return fail(new ContributionError('NOT_ACTIVE'));
    const contribution = this.pay(group, round, me.id);
    if (!contribution) return fail(new ContributionError('ALREADY_PAID'));
    const payout = this.payOutIfComplete(group, round);
    return delay({ contribution, group, payout }, this.txDelayMs);
  }

  /**
   * SOLO DEMO (mock): registra los aportes que faltan en la ronda en curso, como si
   * los demás miembros hubieran pagado, para poder mostrar el desembolso con un solo usuario.
   */
  simulatePendingContributions(groupId: string, userId: string): Promise<ContributeResult | null> {
    const group = this.groups.find((g) => g.id === groupId);
    const round = group?.rounds.find((r) => r.number === group.currentRound);
    if (!group || !round || group.status !== 'ACTIVE') return fail(new ContributionError('NOT_ACTIVE'));
    let last: Contribution | null = null;
    for (const m of group.members) {
      if (m.userId !== userId) {
        last = this.pay(group, round, m.id) ?? last;
      }
    }
    const payout = this.payOutIfComplete(group, round);
    return delay(last ? { contribution: last, group, payout } : null);
  }

  /** Marca pagado el aporte del miembro en la ronda; null si ya estaba pagado. */
  private pay(group: Group, round: Round, memberId: string): Contribution | null {
    const id = `${group.id}-r${round.number}-${memberId}`;
    let contribution = this.contributions.find(
      (c) => c.groupId === group.id && c.roundNumber === round.number && c.memberId === memberId,
    );
    if (contribution?.status === 'PAID') {
      return null;
    }
    if (!contribution) {
      contribution = {
        id,
        groupId: group.id,
        memberId,
        roundNumber: round.number,
        amount: group.contributionAmount,
        status: 'PENDING',
      };
      this.contributions.push(contribution);
    }
    contribution.status = 'PAID';
    contribution.paidAt = new Date().toISOString();
    contribution.txHash = randomTxHash();
    return contribution;
  }

  /** Si todos aportaron en la ronda: desembolso al del turno y abre la siguiente (o cierra el grupo). */
  private payOutIfComplete(group: Group, round: Round): Payout | undefined {
    const paid = this.contributions.filter(
      (c) => c.groupId === group.id && c.roundNumber === round.number && c.status === 'PAID',
    ).length;
    if (paid < group.memberCount) {
      return undefined;
    }
    const now = new Date().toISOString();
    round.status = 'PAID_OUT';
    round.paidOutAt = now;
    round.payoutTxHash = randomTxHash();
    const next = group.rounds.find((r) => r.number === round.number + 1);
    if (next) {
      next.status = 'OPEN';
      group.currentRound = next.number;
    } else {
      group.status = 'COMPLETED';
      group.currentRound = null;
    }
    return {
      roundNumber: round.number,
      recipientMemberId: round.recipientMemberId,
      amount: multiplyAmount(group.contributionAmount, group.memberCount, group.asset.decimals),
      txHash: round.payoutTxHash,
      paidOutAt: now,
    };
  }

  getTurnSwaps(groupId: string): Promise<TurnSwap[]> {
    return delay(this.swaps.filter((s) => s.groupId === groupId));
  }

  chooseTurn(groupId: string, userId: string, turnNumber: number): Promise<Group> {
    const group = this.groups.find((g) => g.id === groupId);
    if (!group) return fail(new TurnError('NOT_FOUND'));
    const me = group.members.find((m) => m.userId === userId);
    if (!me) return fail(new TurnError('NOT_MEMBER'));
    if (group.turnMode !== 'AGREEMENT' || group.status !== 'ASSIGNING_TURNS') return fail(new TurnError('NOT_ALLOWED'));
    if (!Number.isInteger(turnNumber) || turnNumber < 1 || turnNumber > group.memberCount) {
      return fail(new TurnError('NOT_ALLOWED'));
    }
    if (group.members.some((m) => m.id !== me.id && m.turnNumber === turnNumber)) {
      return fail(new TurnError('TURN_TAKEN'));
    }
    me.turnNumber = turnNumber;
    if (group.members.every((m) => m.turnNumber !== null)) {
      startCycle(group);
    }
    return delay(group);
  }

  runDraw(groupId: string, userId: string): Promise<Group> {
    const group = this.groups.find((g) => g.id === groupId);
    if (!group) return fail(new TurnError('NOT_FOUND'));
    if (!isMember(group, userId)) return fail(new TurnError('NOT_MEMBER'));
    if (group.turnMode !== 'DRAW' || group.status !== 'ASSIGNING_TURNS') return fail(new TurnError('NOT_ALLOWED'));
    // Fisher–Yates con números aleatorios criptográficos.
    const order = group.members.map((_, i) => i + 1);
    const random = crypto.getRandomValues(new Uint32Array(order.length));
    for (let i = order.length - 1; i > 0; i--) {
      const j = random[i] % (i + 1);
      [order[i], order[j]] = [order[j], order[i]];
    }
    group.members.forEach((m, i) => (m.turnNumber = order[i]));
    startCycle(group);
    return delay(group);
  }

  proposeSwap(groupId: string, userId: string, toMemberId: string): Promise<TurnSwap> {
    const group = this.groups.find((g) => g.id === groupId);
    if (!group) return fail(new TurnError('NOT_FOUND'));
    const me = group.members.find((m) => m.userId === userId);
    const other = group.members.find((m) => m.id === toMemberId);
    if (!me || !other) return fail(new TurnError('NOT_MEMBER'));
    if (group.turnMode !== 'AGREEMENT') return fail(new TurnError('NOT_ALLOWED'));
    const pending = this.swaps.some(
      (s) =>
        s.groupId === groupId &&
        s.status === 'PROPOSED' &&
        [s.fromMemberId, s.toMemberId].includes(me.id) &&
        [s.fromMemberId, s.toMemberId].includes(other.id),
    );
    if (me.id === other.id || pending || !isSwappable(group, me.turnNumber) || !isSwappable(group, other.turnNumber)) {
      return fail(new TurnError('SWAP_NOT_ALLOWED'));
    }
    const swap: TurnSwap = {
      id: `swap-new-${this.nextId++}`,
      groupId,
      fromMemberId: me.id,
      toMemberId: other.id,
      fromTurn: me.turnNumber as number,
      toTurn: other.turnNumber as number,
      status: 'PROPOSED',
      createdAt: new Date().toISOString(),
    };
    this.swaps.push(swap);
    return delay(swap);
  }

  respondSwap(swapId: string, userId: string, accept: boolean): Promise<TurnSwap> {
    const swap = this.swaps.find((s) => s.id === swapId);
    const group = swap && this.groups.find((g) => g.id === swap.groupId);
    if (!swap || !group) return fail(new TurnError('NOT_FOUND'));
    const me = group.members.find((m) => m.userId === userId);
    if (!me || me.id !== swap.toMemberId) return fail(new TurnError('NOT_MEMBER'));
    if (swap.status !== 'PROPOSED') return fail(new TurnError('NOT_ALLOWED'));
    const from = group.members.find((m) => m.id === swap.fromMemberId);
    if (accept) {
      // Los turnos tienen que seguir siendo los de la propuesta y no haber empezado.
      if (
        !from ||
        from.turnNumber !== swap.fromTurn ||
        me.turnNumber !== swap.toTurn ||
        !isSwappable(group, swap.fromTurn) ||
        !isSwappable(group, swap.toTurn)
      ) {
        return fail(new TurnError('SWAP_NOT_ALLOWED'));
      }
      from.turnNumber = swap.toTurn;
      me.turnNumber = swap.fromTurn;
      for (const round of group.rounds) {
        if (round.number === swap.fromTurn) round.recipientMemberId = me.id;
        else if (round.number === swap.toTurn) round.recipientMemberId = from.id;
      }
    }
    swap.status = accept ? 'ACCEPTED' : 'REJECTED';
    swap.respondedAt = new Date().toISOString();
    return delay(swap);
  }

  getMyGroups(userId: string): Promise<Group[]> {
    return delay(this.groups.filter((g) => isMember(g, userId)));
  }

  getPublicGroups(userId: string): Promise<Group[]> {
    return delay(
      this.groups.filter(
        (g) =>
          g.visibility === 'PUBLIC' &&
          g.status === 'FORMING' &&
          g.members.length < g.memberCount &&
          !isMember(g, userId),
      ),
    );
  }

  getGroup(id: string): Promise<Group | null> {
    return delay(this.groups.find((g) => g.id === id) ?? null);
  }

  getGroupByCode(code: string): Promise<Group | null> {
    const wanted = code.trim().toUpperCase();
    return delay(this.groups.find((g) => g.inviteCode?.toUpperCase() === wanted) ?? null);
  }

  getContributions(groupId: string): Promise<Contribution[]> {
    return delay(this.contributions.filter((c) => c.groupId === groupId));
  }

  getAssets(): Promise<Asset[]> {
    return delay(this.assets);
  }

  createGroup(input: CreateGroupInput, user: User): Promise<Group> {
    const asset = this.assets.find((a) => a.code === input.assetCode);
    if (!asset) {
      return fail(new Error(`Moneda desconocida: ${input.assetCode}`));
    }
    const now = new Date().toISOString();
    const id = `group-new-${this.nextId++}`;
    const group: Group = {
      id,
      name: input.name.trim(),
      contributionAmount: input.contributionAmount,
      asset,
      periodicity: input.periodicity,
      memberCount: input.memberCount,
      visibility: input.visibility,
      turnMode: input.turnMode,
      status: 'FORMING',
      inviteCode: input.visibility === 'PRIVATE' ? this.newInviteCode() : undefined,
      members: [
        {
          id: `${id}-m1`,
          userId: user.id,
          displayName: user.displayName,
          walletAddress: user.walletAddress,
          turnNumber: null,
          joinedAt: now,
        },
      ],
      rounds: [],
      currentRound: null,
      createdAt: now,
    };
    this.groups.unshift(group);
    return delay(group);
  }

  joinGroup(groupId: string, user: User): Promise<Group> {
    const group = this.groups.find((g) => g.id === groupId);
    if (!group) {
      return fail(new JoinGroupError('NOT_FOUND'));
    }
    if (isMember(group, user.id)) {
      return fail(new JoinGroupError('ALREADY_MEMBER'));
    }
    if (group.status !== 'FORMING') {
      return fail(new JoinGroupError('CLOSED'));
    }
    if (group.members.length >= group.memberCount) {
      return fail(new JoinGroupError('FULL'));
    }
    group.members.push({
      id: `${group.id}-m${group.members.length + 1}`,
      userId: user.id,
      displayName: user.displayName,
      walletAddress: user.walletAddress,
      turnNumber: null,
      joinedAt: new Date().toISOString(),
    });
    // Grupo completo: pasa a la asignación de turnos (paso 6).
    if (group.members.length === group.memberCount) {
      group.status = 'ASSIGNING_TURNS';
    }
    return delay(group);
  }

  private newInviteCode(): string {
    let code: string;
    do {
      code = Array.from(
        crypto.getRandomValues(new Uint32Array(6)),
        (n) => CODE_ALPHABET[n % CODE_ALPHABET.length],
      ).join('');
    } while (this.groups.some((g) => g.inviteCode === code));
    return code;
  }
}
