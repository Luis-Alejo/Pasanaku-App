import { Injectable, computed, inject, signal } from '@angular/core';
import { AuthService } from '@core/auth/auth.service';
import type { Contribution, Group } from '@core/models/domain.models';

import { sortMyGroups } from './group-view';
import { GroupsApi } from './groups.api';

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
    }
    this._detailState.set('loading');
    try {
      const [group, contributions] = await Promise.all([this.api.getGroup(id), this.api.getContributions(id)]);
      if (this.requestedId !== id) {
        return;
      }
      this._group.set(group);
      this._contributions.set(contributions);
      this._detailState.set('loaded');
    } catch {
      if (this.requestedId === id) {
        this._detailState.set('error');
      }
    }
  }
}
