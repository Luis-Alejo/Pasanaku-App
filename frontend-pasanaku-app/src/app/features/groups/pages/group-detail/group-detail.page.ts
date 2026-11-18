import { Component, computed, effect, inject, input } from '@angular/core';
import { RouterLink } from '@angular/router';
import type { Group } from '@core/models/domain.models';
import { ToastService } from '@core/services/toast.service';
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
  myMember,
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
  private readonly toast = inject(ToastService);

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

  protected readonly isMember = computed(() => {
    const g = this.store.group();
    return !!g && !!myMember(g, this.userId());
  });

  /** Grupo público con cupo y sin el usuario: puede unirse. */
  protected readonly canJoin = computed(() => {
    const g = this.store.group();
    return (
      !!g && !this.isMember() && g.visibility === 'PUBLIC' && g.status === 'FORMING' && g.members.length < g.memberCount
    );
  });

  /** Miembro de un grupo privado que todavía suma gente: puede invitar. */
  protected readonly canInvite = computed(() => {
    const g = this.store.group();
    return !!g && this.isMember() && g.status === 'FORMING' && !!g.inviteCode;
  });

  protected readonly missingMembers = computed(() => {
    const g = this.store.group();
    return g ? Math.max(0, g.memberCount - g.members.length) : 0;
  });

  constructor() {
    effect(() => {
      void this.store.loadGroup(this.id());
    });
  }

  /** Comparte la invitación con el menú del sistema, o la copia si no hay menú. */
  protected async shareInvite(group: Group): Promise<void> {
    const code = group.inviteCode ?? '';
    const url = `${location.origin}/join/${code}`;
    const text = `Únete a mi pasanaku "${group.name}" con el código ${code}: ${url}`;
    if (navigator.share) {
      try {
        await navigator.share({ title: group.name, text });
        return;
      } catch (error) {
        if (error instanceof DOMException && error.name === 'AbortError') {
          return; // la persona cerró el menú
        }
      }
    }
    try {
      await navigator.clipboard.writeText(text);
      void this.toast.show('Invitación copiada', 'success');
    } catch {
      void this.toast.show(`No se pudo copiar. El código es ${code}`, 'danger');
    }
  }

  protected retry(): void {
    void this.store.loadGroup(this.id());
  }
}
