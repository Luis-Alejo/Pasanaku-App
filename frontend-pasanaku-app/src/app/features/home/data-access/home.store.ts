import { Injectable, computed, inject, signal } from '@angular/core';
import { AuthService } from '@core/auth/auth.service';
import { GroupsApi } from '@core/data/groups.api';
import type { Contribution, Group, TurnSwap } from '@core/models/domain.models';
import { todayIso } from '@shared/utils/date';

import { activeGroups, firstName, nextPayout, pendingPayments, todos } from './home-view';

type LoadState = 'idle' | 'loading' | 'loaded' | 'error';

/** Estado de Inicio: un resumen de los grupos del usuario. Se provee en home.routes.ts. */
@Injectable()
export class HomeStore {
  private readonly api = inject(GroupsApi);
  private readonly auth = inject(AuthService);

  private readonly _groups = signal<Group[]>([]);
  private readonly _contributions = signal<Record<string, Contribution[]>>({});
  private readonly _swaps = signal<Record<string, TurnSwap[]>>({});
  private readonly _state = signal<LoadState>('idle');

  readonly loading = computed(() => this._state() === 'loading');
  readonly error = computed(() => this._state() === 'error');
  readonly loaded = computed(() => this._state() === 'loaded');

  private readonly userId = computed(() => this.auth.currentUser()?.id ?? '');
  readonly greetingName = computed(() => firstName(this.auth.currentUser()?.displayName ?? ''));

  readonly hasGroups = computed(() => this._groups().length > 0);
  readonly pending = computed(() => pendingPayments(this._groups(), this._contributions(), this.userId(), todayIso()));
  readonly payout = computed(() => nextPayout(this._groups(), this.userId()));
  readonly todos = computed(() => todos(this._groups(), this._swaps(), this.userId()));
  readonly active = computed(() => activeGroups(this._groups()));

  /** Carga (o refresca) el resumen. El spinner solo se usa la primera vez. */
  async load(): Promise<void> {
    if (this._state() !== 'loaded') {
      this._state.set('loading');
    }
    try {
      const groups = await this.api.getMyGroups(this.userId());
      // Aportes de los grupos en curso y propuestas de los que pueden tener intercambios.
      const withRounds = groups.filter((g) => g.status === 'ACTIVE');
      const withSwaps = groups.filter((g) => g.turnMode === 'AGREEMENT' && g.status !== 'COMPLETED');
      const [contributions, swaps] = await Promise.all([
        Promise.all(withRounds.map((g) => this.api.getContributions(g.id))),
        Promise.all(withSwaps.map((g) => this.api.getTurnSwaps(g.id))),
      ]);
      this._groups.set(groups);
      this._contributions.set(Object.fromEntries(withRounds.map((g, i) => [g.id, contributions[i]])));
      this._swaps.set(Object.fromEntries(withSwaps.map((g, i) => [g.id, swaps[i]])));
      this._state.set('loaded');
    } catch {
      this._state.set('error');
    }
  }
}
