import { Injectable, inject } from '@angular/core';
import { MOCK_ASSETS, MOCK_CONTRIBUTIONS, MOCK_GROUPS, MOCK_TURN_SWAPS } from '@core/data/groups.mock';
import { ApiError, UNKNOWN_ERROR_MESSAGE, toApiError } from '@core/graphql/api-error';
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
import type { GroupDetailQuery, GroupSummaryFieldsFragment } from '@gql';
import {
  CreateGroupGQL,
  GroupDetailGQL,
  InviteMemberGQL,
  JoinGroupGQL,
  MyGroupsGQL,
  PayRoundGQL,
  PublicGroupsGQL,
  SetTurnOrderGQL,
  StartGroupGQL,
} from '@gql';
import { addDays, addMonths, todayIso } from '@shared/utils/date';
import { multiplyAmount } from '@shared/utils/format';
import type { Observable } from 'rxjs';
import { firstValueFrom } from 'rxjs';

import {
  USDC_ASSET,
  contributionsFromDetail,
  groupFromDetail,
  groupFromSummary,
  hiddenPrivateGroup,
  stroopsToAmount,
} from './group-mappers';
import { isSwappable } from './group-rules';

/**
 * De dónde salen los datos de grupos. El store solo conoce esta interfaz:
 * la versión mock o la de GraphQL, según `environment.useMocks`.
 */
@Injectable({ providedIn: 'root', useFactory: createGroupsApi })
export abstract class GroupsApi {
  /** Con la API real, el organizador define el orden de cobro. */
  readonly organizerControlsTurns: boolean = false;

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
  /** El organizador fija el orden (ids de usuario) y el grupo empieza. */
  abstract startWithOrder(groupId: string, userIds: string[]): Promise<Group>;
  /** El organizador invita por celular a alguien ya registrado. */
  abstract inviteByPhone(groupId: string, phone: string): Promise<void>;
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
  return environment.useMocks ? new MockGroupsApi() : inject(GraphqlGroupsApi);
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

  startWithOrder(): Promise<Group> {
    return fail(new TurnError('NOT_ALLOWED'));
  }

  inviteByPhone(): Promise<void> {
    return delay(undefined);
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

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const DETAIL_MEMO_MS = 1500;
/** El backend refleja los eventos de la cadena unos segundos después de cada transacción. */
const SYNC_TIMEOUT_MS = 60_000;
const SYNC_INTERVAL_MS = 2500;
const TX_KEY = 'pk-tx:';

type GroupDetailData = GroupDetailQuery['groupDetail'];

async function apiData<T>(request: Observable<{ data?: T | null }>): Promise<T> {
  let data: T | null | undefined;
  try {
    ({ data } = await firstValueFrom(request));
  } catch (error) {
    throw toApiError(error);
  }
  if (!data) {
    throw new ApiError('unknown', UNKNOWN_ERROR_MESSAGE);
  }
  return data;
}

function joinError(error: unknown): unknown {
  if (!(error instanceof ApiError)) return error;
  if (error.kind === 'not-found') return new JoinGroupError('NOT_FOUND', error.message);
  if (error.kind === 'forbidden') return new JoinGroupError('CLOSED', error.message);
  if (error.kind === 'conflict') {
    const code = /miembro/i.test(error.message) ? 'ALREADY_MEMBER' : /lleno/i.test(error.message) ? 'FULL' : 'CLOSED';
    return new JoinGroupError(code, error.message);
  }
  return error;
}

function turnError(error: unknown): unknown {
  return error instanceof ApiError && error.kind !== 'network' && error.kind !== 'unknown'
    ? new TurnError(error.kind === 'not-found' ? 'NOT_FOUND' : 'NOT_ALLOWED', error.message)
    : error;
}

function contributionError(error: unknown): unknown {
  if (!(error instanceof ApiError)) return error;
  if (error.kind === 'not-found') return new ContributionError('NOT_FOUND', error.message);
  if (error.kind === 'forbidden') return new ContributionError('NOT_MEMBER', error.message);
  if (error.kind === 'conflict') {
    return new ContributionError(/pag|registrad/i.test(error.message) ? 'ALREADY_PAID' : 'NOT_ACTIVE', error.message);
  }
  return error;
}

/** Datos reales del backend. Las transacciones las firma él con la clave custodiada. */
@Injectable({ providedIn: 'root' })
export class GraphqlGroupsApi extends GroupsApi {
  override readonly organizerControlsTurns = true;

  private readonly myGroupsGql = inject(MyGroupsGQL);
  private readonly publicGroupsGql = inject(PublicGroupsGQL);
  private readonly detailGql = inject(GroupDetailGQL);
  private readonly createGql = inject(CreateGroupGQL);
  private readonly joinGql = inject(JoinGroupGQL);
  private readonly inviteGql = inject(InviteMemberGQL);
  private readonly orderGql = inject(SetTurnOrderGQL);
  private readonly startGql = inject(StartGroupGQL);
  private readonly payGql = inject(PayRoundGQL);

  private readonly details = new Map<string, { at: number; request: Promise<GroupDetailData> }>();

  /** Detalle del grupo; varias lecturas seguidas comparten la misma consulta. */
  private detail(id: string, fresh = false): Promise<GroupDetailData> {
    const memo = this.details.get(id);
    if (!fresh && memo && Date.now() - memo.at < DETAIL_MEMO_MS) {
      return memo.request;
    }
    const request = apiData(this.detailGql.fetch({ variables: { groupId: id }, fetchPolicy: 'no-cache' })).then(
      (data) => data.groupDetail,
    );
    this.details.set(id, { at: Date.now(), request });
    request.catch(() => this.details.delete(id));
    return request;
  }

  /**
   * Espera a que el backend refleje una transacción; si tarda, devuelve lo último.
   * Quien acaba de unirse recibe "no encontrado" hasta que se registre como miembro.
   */
  private async waitFor(id: string, done: (group: GroupDetailData) => boolean): Promise<GroupDetailData> {
    const limit = Date.now() + SYNC_TIMEOUT_MS;
    let group: GroupDetailData | null = null;
    for (;;) {
      try {
        group = await this.detail(id, true);
        if (done(group)) return group;
      } catch (error) {
        if (!(error instanceof ApiError) || error.kind !== 'not-found') throw error;
      }
      if (Date.now() >= limit) {
        if (group) return group;
        throw new ApiError('unknown', 'La transacción se envió, pero el grupo tarda en actualizarse.');
      }
      await new Promise((resolve) => setTimeout(resolve, SYNC_INTERVAL_MS));
    }
  }

  private async summaries(kind: 'mine' | 'public'): Promise<GroupSummaryFieldsFragment[]> {
    if (kind === 'mine') {
      return (await apiData(this.myGroupsGql.fetch({ fetchPolicy: 'no-cache' }))).myGroups;
    }
    return (await apiData(this.publicGroupsGql.fetch({ fetchPolicy: 'no-cache' }))).publicGroups;
  }

  override async getMyGroups(): Promise<Group[]> {
    const mine = await this.summaries('mine');
    return Promise.all(mine.map(async (g) => groupFromDetail(await this.detail(g.id))));
  }

  override async getPublicGroups(): Promise<Group[]> {
    const [publics, mine] = await Promise.all([this.summaries('public'), this.summaries('mine')]);
    const myIds = new Set(mine.map((g) => g.id));
    return publics.filter((g) => !myIds.has(g.id) && g.memberCount < g.maxParticipants).map(groupFromSummary);
  }

  override async getGroup(id: string): Promise<Group | null> {
    try {
      return groupFromDetail(await this.detail(id));
    } catch (error) {
      if (!(error instanceof ApiError) || error.kind !== 'not-found') throw error;
    }
    // Solo los miembros ven el detalle; un grupo público se conoce por su resumen.
    const summary = (await this.summaries('public')).find((g) => g.id === id);
    return summary ? groupFromSummary(summary) : null;
  }

  override async getGroupByCode(code: string): Promise<Group | null> {
    if (!UUID.test(code)) return null;
    const id = code.toLowerCase();
    return (await this.getGroup(id)) ?? hiddenPrivateGroup(id);
  }

  override async getContributions(groupId: string): Promise<Contribution[]> {
    try {
      return contributionsFromDetail(await this.detail(groupId), (round, member) =>
        this.readTxHash(groupId, round, member),
      );
    } catch (error) {
      if (error instanceof ApiError && error.kind === 'not-found') return [];
      throw error;
    }
  }

  override getAssets(): Promise<Asset[]> {
    return Promise.resolve([USDC_ASSET]);
  }

  override async createGroup(input: CreateGroupInput, user: User): Promise<Group> {
    const { createGroup } = await apiData(
      this.createGql.mutate({
        variables: {
          input: {
            name: input.name,
            contributionUsdc: input.contributionAmount,
            frequency: input.periodicity,
            maxParticipants: input.memberCount,
            isPublic: input.visibility === 'PUBLIC',
          },
        },
      }),
    );
    // El contrato no incluye al creador: entra como cualquier miembro.
    return this.joinGroup(createGroup.id, user);
  }

  override async joinGroup(groupId: string, user: User): Promise<Group> {
    try {
      await apiData(this.joinGql.mutate({ variables: { groupId } }));
    } catch (error) {
      throw joinError(error);
    }
    return groupFromDetail(await this.waitFor(groupId, (g) => g.members.some((m) => m.userId === user.id)));
  }

  override async inviteByPhone(groupId: string, phone: string): Promise<void> {
    await apiData(this.inviteGql.mutate({ variables: { input: { groupId, phone } } }));
  }

  override getTurnSwaps(): Promise<TurnSwap[]> {
    return Promise.resolve([]);
  }

  override chooseTurn(): Promise<Group> {
    return Promise.reject(new TurnError('NOT_ALLOWED'));
  }

  override proposeSwap(): Promise<TurnSwap> {
    return Promise.reject(new TurnError('NOT_ALLOWED'));
  }

  override respondSwap(): Promise<TurnSwap> {
    return Promise.reject(new TurnError('NOT_ALLOWED'));
  }

  /** El sorteo lo hace la app: mezcla a los miembros y envía ese orden. */
  override async runDraw(groupId: string): Promise<Group> {
    const ids = (await this.detail(groupId, true)).members.map((m) => m.userId);
    for (let i = ids.length - 1; i > 0; i--) {
      const j = crypto.getRandomValues(new Uint32Array(1))[0] % (i + 1);
      [ids[i], ids[j]] = [ids[j], ids[i]];
    }
    return this.startWithOrder(groupId, ids);
  }

  override async startWithOrder(groupId: string, userIds: string[]): Promise<Group> {
    try {
      await apiData(this.orderGql.mutate({ variables: { input: { groupId, userIds } } }));
      await apiData(this.startGql.mutate({ variables: { groupId } }));
    } catch (error) {
      throw turnError(error);
    }
    return groupFromDetail(await this.waitFor(groupId, (g) => g.status === 'ACTIVE' && g.rounds.length > 0));
  }

  override async contribute(groupId: string, userId: string): Promise<ContributeResult> {
    let before: GroupDetailData;
    let txHash: string;
    try {
      before = await this.detail(groupId, true);
      ({
        payRound: { txHash },
      } = await apiData(this.payGql.mutate({ variables: { groupId } })));
    } catch (error) {
      throw contributionError(error);
    }
    const member = before.members.find((m) => m.userId === userId);
    const roundNumber = before.currentRound;
    if (!member) throw new ContributionError('NOT_MEMBER');
    this.saveTxHash(groupId, roundNumber, member.id, txHash);

    const after = await this.waitFor(groupId, (g) =>
      g.rounds.some(
        (r) =>
          r.roundNumber === roundNumber && r.payments.some((p) => p.memberId === member.id && p.status !== 'PENDING'),
      ),
    );
    const contribution = contributionsFromDetail(after, (round, id) => this.readTxHash(groupId, round, id)).find(
      (c) => c.roundNumber === roundNumber && c.memberId === member.id,
    );
    return {
      group: groupFromDetail(after),
      contribution: contribution ?? {
        id: `${roundNumber}-${member.id}`,
        groupId,
        memberId: member.id,
        roundNumber,
        amount: stroopsToAmount(after.contributionStroops),
        status: 'PAID',
        txHash,
      },
    };
  }

  // El backend todavía no expone el hash de cada aporte: se recuerda el propio.
  private readTxHash(groupId: string, round: number, memberId: string): string | undefined {
    try {
      return localStorage.getItem(`${TX_KEY}${groupId}:${round}:${memberId}`) ?? undefined;
    } catch {
      return undefined;
    }
  }

  private saveTxHash(groupId: string, round: number, memberId: string, txHash: string): void {
    try {
      localStorage.setItem(`${TX_KEY}${groupId}:${round}:${memberId}`, txHash);
    } catch {
      // Solo se pierde el enlace al explorador.
    }
  }
}
