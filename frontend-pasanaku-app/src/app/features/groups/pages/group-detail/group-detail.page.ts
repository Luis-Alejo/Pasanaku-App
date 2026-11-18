import { Component, computed, effect, inject, input } from '@angular/core';
import { RouterLink } from '@angular/router';
import {
  IonBackButton,
  IonButton,
  IonButtons,
  IonContent,
  IonHeader,
  IonItem,
  IonLabel,
  IonList,
  IonNote,
  IonSpinner,
  IonTitle,
  IonToolbar,
} from '@ionic/angular';
import { MoneyPipe } from '@shared/pipes/money.pipe';
import { AmountCardComponent } from '@shared/ui/amount-card/amount-card.component';
import { EmptyStateComponent } from '@shared/ui/empty-state/empty-state.component';
import { PaymentStatusBadgeComponent } from '@shared/ui/payment-status-badge/payment-status-badge.component';
import { TurnTimelineComponent } from '@shared/ui/turn-timeline/turn-timeline.component';
import { formatDate, plural } from '@shared/utils/format';
import { cloudOfflineOutline, helpCircleOutline, shuffleOutline } from 'ionicons/icons';

import {
  PERIODICITY_LABELS,
  STATUS_LABELS,
  TURN_MODE_LABELS,
  VISIBILITY_LABELS,
  currentRoundFund,
  roundPayments,
  sortByTurn,
  turnSteps,
} from '../../data-access/group-view';
import { GroupsStore } from '../../data-access/groups.store';

@Component({
  selector: 'app-group-detail',
  templateUrl: './group-detail.page.html',
  styleUrls: ['./group-detail.page.scss'],
  imports: [
    IonContent,
    IonHeader,
    IonTitle,
    IonToolbar,
    IonButtons,
    IonBackButton,
    IonButton,
    IonList,
    IonItem,
    IonLabel,
    IonNote,
    IonSpinner,
    RouterLink,
    MoneyPipe,
    AmountCardComponent,
    EmptyStateComponent,
    PaymentStatusBadgeComponent,
    TurnTimelineComponent,
  ],
})
export class GroupDetailPage {
  protected readonly store = inject(GroupsStore);

  /** Viene de la ruta /tabs/groups/:id (withComponentInputBinding). */
  readonly id = input.required<string>();

  protected readonly labels = {
    status: STATUS_LABELS,
    periodicity: PERIODICITY_LABELS,
    turnMode: TURN_MODE_LABELS,
    visibility: VISIBILITY_LABELS,
  };
  protected readonly icons = { error: cloudOfflineOutline, notFound: helpCircleOutline, turns: shuffleOutline };
  protected readonly formatDate = formatDate;

  private readonly userId = this.store.currentUserId;

  protected readonly fund = computed(() => {
    const g = this.store.group();
    return g ? currentRoundFund(g, this.store.contributions()) : null;
  });

  protected readonly fundCaption = computed(() => {
    const f = this.fund();
    if (!f) {
      return '';
    }
    return `${f.paidCount} de ${f.memberCount} ${plural(f.memberCount, 'aporte', 'aportes')} · vence el ${formatDate(f.dueDate)}`;
  });

  protected readonly steps = computed(() => {
    const g = this.store.group();
    return g ? turnSteps(g, this.userId()) : [];
  });

  /** Aportes de la ronda en curso; vacío si el grupo no está en una ronda. */
  protected readonly payments = computed(() => {
    const g = this.store.group();
    return g && g.currentRound ? roundPayments(g, this.store.contributions(), g.currentRound, this.userId()) : [];
  });

  protected readonly members = computed(() => {
    const g = this.store.group();
    return g ? sortByTurn(g.members) : [];
  });

  constructor() {
    effect(() => {
      void this.store.loadGroup(this.id());
    });
  }

  protected retry(): void {
    void this.store.loadGroup(this.id());
  }
}
