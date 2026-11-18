import { Injectable, computed, inject, signal } from '@angular/core';
import { AuthService } from '@core/auth/auth.service';
import { GroupsApi, MockGroupsApi } from '@core/data/groups.api';
import type {
  Asset,
  ContributeResult,
  Contribution,
  CreateGroupInput,
  Group,
  TurnSwap,
  User,
} from '@core/models/domain.models';

import { sortMyGroups } from './group-view';

type LoadState = 'idle' | 'loading' | 'loaded' | 'error';

/**
 * Estado de la feature de grupos (signals de solo lectura).
 * Se provee en groups.routes.ts: uno por feature.
 */
@Injectable()
export class GroupsStore {
  private readonly api = inject(GroupsApi);
  private readonly auth = inject(AuthService);

  // --- Listas
  private readonly _myGroups = signal<Group[]>([]);
  private readonly _publicGroups = signal<Group[]>([]);
  private readonly _listState = signal<LoadState>('idle');

  readonly myGroups = computed(() => sortMyGroups(this._myGroups()));
  readonly publicGroups = this._publicGroups.asReadonly();
  readonly listLoading = computed(() => this._listState() === 'loading');
  readonly listError = computed(() => this._listState() === 'error');

  // --- Detalle
  private readonly _group = signal<Group | null>(null);
  private readonly _contributions = signal<Contribution[]>([]);
  private readonly _detailState = signal<LoadState>('idle');
  /** Id pedido más reciente: descarta respuestas viejas si el usuario cambia rápido de grupo. */
  private requestedId: string | null = null;

  readonly group = this._group.asReadonly();
  readonly contributions = this._contributions.asReadonly();
  readonly detailLoading = computed(() => this._detailState() === 'loading');
  readonly detailError = computed(() => this._detailState() === 'error');
  readonly notFound = computed(() => this._detailState() === 'loaded' && this._group() === null);

  readonly currentUserId = computed(() => this.auth.currentUser()?.id ?? '');

  // --- Monedas (para el formulario de crear)
  private readonly _assets = signal<Asset[]>([]);
  readonly assets = this._assets.asReadonly();

  // --- Unirse: el grupo que la persona está viendo para unirse
  private readonly _joinTarget = signal<Group | null>(null);
  private readonly _joinState = signal<LoadState>('idle');
  readonly joinTarget = this._joinTarget.asReadonly();
  readonly joinLoading = computed(() => this._joinState() === 'loading');
  readonly joinError = computed(() => this._joinState() === 'error');
  readonly joinNotFound = computed(() => this._joinState() === 'loaded' && this._joinTarget() === null);

  async loadAssets(): Promise<void> {
    if (this._assets().length === 0) {
      this._assets.set(await this.api.getAssets());
    }
  }

  /** Crea el grupo y lo devuelve (la pantalla navega a su detalle). */
  async createGroup(input: CreateGroupInput): Promise<Group> {
    const user = this.requireUser();
    const group = await this.api.createGroup(input, user);
    this._myGroups.update((groups) => [group, ...groups]);
    return group;
  }

  /** Carga el grupo al que se quiere unir, por código de invitación o por id. */
  async loadJoinTarget(by: { code: string } | { id: string }): Promise<void> {
    this._joinTarget.set(null);
    this._joinState.set('loading');
    try {
      const group = 'code' in by ? await this.api.getGroupByCode(by.code) : await this.api.getGroup(by.id);
      this._joinTarget.set(group);
      this._joinState.set('loaded');
    } catch {
      this._joinState.set('error');
    }
  }

  /** Une al usuario al grupo. Lanza `JoinGroupError` si no se puede. */
  async joinGroup(groupId: string): Promise<Group> {
    const group = await this.api.joinGroup(groupId, this.requireUser());
    this._joinTarget.set(group);
    this._myGroups.update((groups) => [group, ...groups.filter((g) => g.id !== group.id)]);
    this._publicGroups.update((groups) => groups.filter((g) => g.id !== group.id));
    return group;
  }

  // --- Turnos
  private readonly _swaps = signal<TurnSwap[]>([]);
  /** Propuestas de intercambio del grupo cargado (llegan junto con el grupo en loadGroup). */
  readonly swaps = this._swaps.asReadonly();

  /** Lanza `TurnError` si no se puede. */
  async chooseTurn(turnNumber: number): Promise<Group> {
    const group = await this.api.chooseTurn(this.requireGroupId(), this.requireUser().id, turnNumber);
    this._group.set(group);
    return group;
  }

  /** Lanza `TurnError` si no se puede. */
  async runDraw(): Promise<Group> {
    const group = await this.api.runDraw(this.requireGroupId(), this.requireUser().id);
    this._group.set(group);
    return group;
  }

  /** Lanza `TurnError` si no se puede. */
  async proposeSwap(toMemberId: string): Promise<void> {
    const swap = await this.api.proposeSwap(this.requireGroupId(), this.requireUser().id, toMemberId);
    this._swaps.update((swaps) => [...swaps, swap]);
  }

  /** Acepta o rechaza; si acepta, recarga el grupo (cambian turnos y rondas). Lanza `TurnError`. */
  async respondSwap(swapId: string, accept: boolean): Promise<void> {
    const swap = await this.api.respondSwap(swapId, this.requireUser().id, accept);
    this._swaps.update((swaps) => swaps.map((s) => (s.id === swap.id ? swap : s)));
    if (accept) {
      const group = await this.api.getGroup(swap.groupId);
      if (group) {
        this._group.set(group);
      }
    }
  }

  // --- Aportes
  /** La simulación de aportes ajenos solo existe con los datos de prueba. */
  readonly canSimulate = this.api instanceof MockGroupsApi;

  /** Registra el aporte del usuario. Lanza `ContributionError` si no se puede. */
  async contribute(): Promise<ContributeResult> {
    const result = await this.api.contribute(this.requireGroupId(), this.requireUser().id);
    this.applyContribution(result);
    return result;
  }

  /** SOLO DEMO: paga los aportes que faltan de los demás miembros. */
  async simulatePendingContributions(): Promise<ContributeResult | null> {
    if (!(this.api instanceof MockGroupsApi)) {
      return null;
    }
    const result = await this.api.simulatePendingContributions(this.requireGroupId(), this.requireUser().id);
    if (result) {
      this.applyContribution(result);
    }
    return result;
  }

  private applyContribution(result: ContributeResult): void {
    this._group.set(result.group);
    // Los aportes de la ronda cambiaron: se vuelven a pedir completos.
    void this.api.getContributions(result.group.id).then((c) => {
      if (this._group()?.id === result.group.id) {
        this._contributions.set(c);
      }
    });
  }

  private requireGroupId(): string {
    const id = this._group()?.id;
    if (!id) {
      throw new Error('No hay un grupo cargado');
    }
    return id;
  }

  private requireUser(): User {
    const user = this.auth.currentUser();
    if (!user) {
      throw new Error('No hay sesión iniciada');
    }
    return user;
  }

  async loadLists(): Promise<void> {
    const userId = this.currentUserId();
    this._listState.set('loading');
    try {
      const [mine, publics] = await Promise.all([this.api.getMyGroups(userId), this.api.getPublicGroups(userId)]);
      this._myGroups.set(mine);
      this._publicGroups.set(publics);
      this._listState.set('loaded');
    } catch {
      this._listState.set('error');
    }
  }

  async loadGroup(id: string): Promise<void> {
    this.requestedId = id;
    if (this._group()?.id !== id) {
      this._group.set(null);
      this._contributions.set([]);
      this._swaps.set([]);
    }
    this._detailState.set('loading');
    try {
      const [group, contributions, swaps] = await Promise.all([
        this.api.getGroup(id),
        this.api.getContributions(id),
        this.api.getTurnSwaps(id),
      ]);
      if (this.requestedId !== id) {
        return;
      }
      this._group.set(group);
      this._contributions.set(contributions);
      this._swaps.set(swaps);
      this._detailState.set('loaded');
    } catch {
      if (this.requestedId === id) {
        this._detailState.set('error');
      }
    }
  }
}
