import { Component, computed, effect, inject, input, signal, untracked } from '@angular/core';
import { explorerTxUrl, shortHash } from '@core/stellar/explorer';
import type { SegmentCustomEvent } from '@ionic/angular';
import {
  IonBackButton,
  IonButton,
  IonButtons,
  IonContent,
  IonHeader,
  IonIcon,
  IonSegment,
  IonSegmentButton,
  IonSpinner,
  IonTitle,
  IonToolbar,
} from '@ionic/angular';
import { MoneyPipe } from '@shared/pipes/money.pipe';
import { EmptyStateComponent } from '@shared/ui/empty-state/empty-state.component';
import { formatDate } from '@shared/utils/format';
import {
  arrowUpOutline,
  cashOutline,
  cloudOfflineOutline,
  flagOutline,
  helpCircleOutline,
  openOutline,
  sparklesOutline,
  swapHorizontalOutline,
  timeOutline,
} from 'ionicons/icons';

import type { HistoryKind } from '../../data-access/group-view';
import { historyEvents } from '../../data-access/group-view';
import { GroupsStore } from '../../data-access/groups.store';

const KIND_ICONS: Record<HistoryKind, string> = {
  contribution: arrowUpOutline,
  payout: cashOutline,
  swap: swapHorizontalOutline,
  start: flagOutline,
  created: sparklesOutline,
};

/** Historial verificable del grupo: aportes, cobros e intercambios con enlace al explorador. */
@Component({
  selector: 'app-group-history',
  templateUrl: './group-history.page.html',
  styleUrls: ['./group-history.page.scss'],
  imports: [
    IonHeader,
    IonToolbar,
    IonTitle,
    IonButtons,
    IonBackButton,
    IonContent,
    IonSegment,
    IonSegmentButton,
    IonButton,
    IonIcon,
    IonSpinner,
    MoneyPipe,
    EmptyStateComponent,
  ],
})
export class GroupHistoryPage {
  protected readonly store = inject(GroupsStore);

  /** De la ruta /tabs/groups/:id/history */
  readonly id = input.required<string>();

  protected readonly filter = signal<'all' | 'mine'>('all');
  protected readonly kindIcons = KIND_ICONS;
  protected readonly icons = {
    error: cloudOfflineOutline,
    notFound: helpCircleOutline,
    empty: timeOutline,
    external: openOutline,
  };
  protected readonly txUrl = explorerTxUrl;
  protected readonly shortHash = shortHash;

  protected readonly events = computed(() => {
    const g = this.store.group();
    if (!g) return [];
    const all = historyEvents(g, this.store.contributions(), this.store.swaps(), this.store.currentUserId());
    return this.filter() === 'mine' ? all.filter((e) => e.isMine) : all;
  });

  constructor() {
    // Solo el id de la ruta dispara la carga: untracked evita que el effect se
    // suscriba al grupo del store (que loadGroup lee) y se repita al cambiar.
    effect(() => {
      const id = this.id();
      untracked(() => void this.store.loadGroup(id));
    });
  }

  protected date(iso: string): string {
    return formatDate(iso, true);
  }

  protected onFilterChange(event: SegmentCustomEvent): void {
    this.filter.set(event.detail.value === 'mine' ? 'mine' : 'all');
  }

  protected retry(): void {
    void this.store.loadGroup(this.id());
  }
}
