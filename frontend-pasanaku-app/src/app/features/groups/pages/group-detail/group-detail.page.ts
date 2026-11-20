import { Component, computed, effect, inject, input, signal, untracked } from '@angular/core';
import { RouterLink } from '@angular/router';
import { toApiError } from '@core/graphql/api-error';
import type { Group } from '@core/models/domain.models';
import { ContributionError } from '@core/models/domain.models';
import { ThemeService } from '@core/services/theme.service';
import { ToastService } from '@core/services/toast.service';
import { AlertController, IonBackButton, IonButton, IonContent, IonSpinner } from '@ionic/angular';
import { MoneyPipe } from '@shared/pipes/money.pipe';
import { AmountCardComponent } from '@shared/ui/amount-card/amount-card.component';
import { AvatarComponent } from '@shared/ui/avatar/avatar.component';
import { BrandHeaderComponent } from '@shared/ui/brand-header/brand-header.component';
import { EmptyStateComponent } from '@shared/ui/empty-state/empty-state.component';
import { InfoRowComponent } from '@shared/ui/info-row/info-row.component';
import { PaymentStatusBadgeComponent } from '@shared/ui/payment-status-badge/payment-status-badge.component';
import type { QuickAction } from '@shared/ui/quick-actions/quick-actions.component';
import { QuickActionsComponent } from '@shared/ui/quick-actions/quick-actions.component';
import { TurnTimelineComponent } from '@shared/ui/turn-timeline/turn-timeline.component';
import { formatDate, plural } from '@shared/utils/format';
import {
  cloudOfflineOutline,
  helpCircleOutline,
  personAddOutline,
  receiptOutline,
  shuffleOutline,
  walletOutline,
} from 'ionicons/icons';

import {
  PERIODICITY_LABELS,
  VISIBILITY_LABELS,
  currentRoundFund,
  incomingProposals,
  myMember,
  roundPayments,
  sortByTurn,
  periodicityLabel,
  statusLabel,
  turnModeLabel,
  turnSteps,
} from '../../data-access/group-view';
import { GroupsStore } from '../../data-access/groups.store';

const REFRESH_MS = 15_000;

@Component({
  selector: 'app-group-detail',
  templateUrl: './group-detail.page.html',
  styleUrls: ['./group-detail.page.scss'],
  imports: [
    IonContent,
    IonBackButton,
    IonButton,
    IonSpinner,
    RouterLink,
    MoneyPipe,
    AmountCardComponent,
    AvatarComponent,
    BrandHeaderComponent,
    EmptyStateComponent,
    InfoRowComponent,
    PaymentStatusBadgeComponent,
    QuickActionsComponent,
    TurnTimelineComponent,
  ],
})
export class GroupDetailPage {
  protected readonly store = inject(GroupsStore);
  private readonly toast = inject(ToastService);
  private readonly theme = inject(ThemeService);
  private readonly alerts = inject(AlertController);

  /** Viene de la ruta /tabs/groups/:id (withComponentInputBinding). */
  readonly id = input.required<string>();

  protected readonly labels = {
    periodicity: PERIODICITY_LABELS,
    visibility: VISIBILITY_LABELS,
  };
  protected readonly icons = { error: cloudOfflineOutline, notFound: helpCircleOutline, turns: shuffleOutline };
  protected readonly formatDate = formatDate;
  protected readonly turnModeLabel = turnModeLabel;
  protected readonly periodicityLabel = periodicityLabel;
  protected readonly statusLabel = statusLabel;

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
    return g ? sortByTurn(g.members).filter((m) => m.userId) : [];
  });

  protected readonly isMember = computed(() => {
    const g = this.store.group();
    return !!g && !!myMember(g, this.userId());
  });

  /** Grupo público con cupo y sin el usuario: puede unirse. */
  protected readonly canJoin = computed(() => {
    const g = this.store.group();
    return (
      !!g &&
      !this.isMember() &&
      (g.visibility === 'PUBLIC' || !!g.invited) &&
      g.status === 'FORMING' &&
      g.members.length < g.memberCount
    );
  });

  /** Miembro de un grupo privado que todavía suma gente: puede invitar. */
  protected readonly canInvite = computed(() => {
    const g = this.store.group();
    return !!g && this.isMember() && g.status === 'FORMING' && !!g.inviteCode && this.isOrganizerOrAny();
  });

  /** Sin organizador conocido (datos de prueba), cualquier miembro puede invitar. */
  private readonly isOrganizerOrAny = computed(() => {
    const organizer = this.store.group()?.organizerUserId;
    return !organizer || organizer === this.userId();
  });

  /** Puede definir el orden de cobro (o, con datos de prueba, elegir su turno). */
  protected readonly canSetTurns = computed(() => {
    const g = this.store.group();
    return !!g && this.isMember() && g.status === 'ASSIGNING_TURNS' && (!g.turnsByOrganizer || this.isOrganizerOrAny());
  });

  /** Mi aporte de la ronda en curso, si todavía no está pagado. */
  protected readonly myPendingPayment = computed(() => {
    const mine = this.payments().find((p) => p.isMe);
    return mine && mine.status !== 'PAID' ? mine : null;
  });

  protected readonly simulating = signal(false);

  /** SOLO DEMO: los demás miembros pagan, para mostrar el desembolso. */
  protected async simulateOthers(): Promise<void> {
    if (this.simulating()) return;
    this.simulating.set(true);
    try {
      const result = await this.store.simulatePendingContributions();
      const payout = result?.payout;
      if (payout) {
        const g = result.group;
        const who = g.members.find((m) => m.id === payout.recipientMemberId);
        const amount = new MoneyPipe().transform(payout.amount, g.asset);
        void this.toast.show(
          `Ronda ${payout.roundNumber} completa: ${who?.userId === this.userId() ? 'recibiste' : `${who?.displayName} recibió`} ${amount}`,
          'success',
        );
      } else if (result) {
        void this.toast.show('Aportaron los demás. Falta tu aporte para completar la ronda.', 'medium');
      } else {
        void this.toast.show('No había aportes pendientes de los demás.', 'medium');
      }
    } catch {
      void this.toast.show('No se pudo simular. Inténtalo de nuevo.', 'danger');
    } finally {
      this.simulating.set(false);
    }
  }

  /** Propuestas de intercambio que esperan la respuesta del usuario. */
  protected readonly pendingForMe = computed(() => {
    const g = this.store.group();
    return g ? incomingProposals(g, this.store.swaps(), this.userId()).length : 0;
  });

  protected readonly missingMembers = computed(() => {
    const g = this.store.group();
    return g ? Math.max(0, g.memberCount - g.members.length) : 0;
  });

  /** Tarjeta del encabezado: fondo de la ronda en curso o, si no hay ronda, el aporte por ronda. */
  protected readonly hero = computed(() => {
    const g = this.store.group();
    if (!g) return null;
    const f = this.fund();
    if (f) {
      return {
        label: `Fondo de la ronda ${f.roundNumber}`,
        amount: f.collected,
        asset: g.asset,
        meta: `Ronda ${f.roundNumber} de ${g.rounds.length}`,
        caption: `${this.fundCaption()} · meta ${new MoneyPipe().transform(f.target, g.asset)}`,
      };
    }
    return {
      label: 'Aporte por ronda',
      amount: g.contributionAmount,
      asset: g.asset,
      meta: statusLabel(g),
      caption: periodicityLabel(g),
    };
  });

  /** Accesos rápidos del kit: solo para miembros, con avisos según el estado. */
  protected readonly actions = computed<QuickAction[]>(() => {
    const g = this.store.group();
    if (!g || !this.isMember()) return [];
    const list: QuickAction[] = [];
    if (g.status === 'ACTIVE') {
      list.push({
        id: 'pay',
        label: 'Aportar',
        icon: walletOutline,
        accent: 'indigo',
        link: ['/tabs/groups', g.id, 'contribute'],
        badge: this.myPendingPayment() ? 1 : undefined,
      });
    }
    if (g.status !== 'FORMING') {
      list.push({
        id: 'turns',
        label: 'Turnos',
        icon: shuffleOutline,
        accent: 'teal',
        link: ['/tabs/groups', g.id, 'turns'],
        badge: this.pendingForMe() || undefined,
      });
    }
    if (this.canInvite()) {
      list.push({ id: 'invite', label: 'Invitar', icon: personAddOutline, accent: 'orange' });
    }
    if (g.rounds.length || g.turnsAssignedAt) {
      list.push({
        id: 'history',
        label: 'Historial',
        icon: receiptOutline,
        accent: 'blue',
        link: ['/tabs/groups', g.id, 'history'],
      });
    }
    return list;
  });

  protected onAction(id: string): void {
    const g = this.store.group();
    if (id === 'invite' && g) {
      void this.shareInvite(g);
    }
  }

  /** Deudas abiertas del grupo, con los nombres. */
  protected readonly debts = computed(() => {
    const g = this.store.group();
    const name = (id: string) => g?.members.find((m) => m.id === id)?.displayName ?? 'Un miembro';
    const me = g ? myMember(g, this.userId()) : undefined;
    return (g?.debts ?? [])
      .filter((d) => !d.settled)
      .map((d) => ({
        ...d,
        debtorName: name(d.debtorMemberId),
        beneficiaryName: name(d.beneficiaryMemberId),
        mine: d.debtorMemberId === me?.id,
      }));
  });

  /** El atraso del usuario más antiguo (se paga primero). */
  protected readonly myDebt = computed(
    () =>
      this.debts()
        .filter((d) => d.mine)
        .sort((a, b) => a.roundNumber - b.roundNumber)[0] ?? null,
  );

  protected readonly payingDebt = signal(false);

  protected async payDebt(): Promise<void> {
    const debt = this.myDebt();
    const g = this.store.group();
    if (!debt || !g || this.payingDebt()) return;
    const amount = new MoneyPipe().transform(debt.remaining, g.asset);
    const alert = await this.alerts.create({
      header: 'Pagar atraso',
      message: `Vas a pagar ${amount} a ${debt.beneficiaryName} por la ronda ${debt.roundNumber}.`,
      buttons: [
        { text: 'Cancelar', role: 'cancel' },
        { text: 'Pagar', role: 'confirm' },
      ],
    });
    await alert.present();
    const { role } = await alert.onDidDismiss();
    if (role !== 'confirm') return;
    this.payingDebt.set(true);
    try {
      await this.store.payArrears(debt.roundNumber);
      void this.toast.show('Atraso pagado', 'success');
    } catch (error) {
      void this.toast.show(
        error instanceof ContributionError && error.detail ? error.detail : 'No se pudo pagar. Inténtalo de nuevo.',
        'danger',
      );
    } finally {
      this.payingDebt.set(false);
    }
  }

  /** El organizador puede editar o cancelar mientras el grupo no empieza. */
  protected readonly canManage = computed(() => {
    const g = this.store.group();
    return (
      !!g &&
      !!g.organizerUserId &&
      g.organizerUserId === this.userId() &&
      (g.status === 'FORMING' || g.status === 'ASSIGNING_TURNS')
    );
  });

  /** Solo se cancela sin otros miembros: sus garantías ya están en el contrato. */
  protected readonly canCancel = computed(() => (this.store.group()?.members.length ?? 0) <= 1);

  protected readonly managing = signal(false);

  protected async rename(): Promise<void> {
    const g = this.store.group();
    if (!g || this.managing()) return;
    const alert = await this.alerts.create({
      header: 'Editar nombre',
      inputs: [
        { name: 'name', type: 'text', value: g.name, attributes: { maxlength: 60, 'aria-label': 'Nombre del grupo' } },
      ],
      buttons: [
        { text: 'Cancelar', role: 'cancel' },
        { text: 'Guardar', role: 'confirm' },
      ],
    });
    await alert.present();
    const { role, data } = await alert.onDidDismiss<{ values: { name: string } }>();
    const name = data?.values.name.trim() ?? '';
    if (role !== 'confirm' || name === g.name) return;
    if (name.length < 3) {
      void this.toast.show('El nombre debe tener al menos 3 letras.', 'danger');
      return;
    }
    await this.manage(() => this.store.renameGroup(name), 'Nombre actualizado');
  }

  protected async cancelGroup(): Promise<void> {
    const g = this.store.group();
    if (!g || this.managing()) return;
    const alert = await this.alerts.create({
      header: 'Cancelar grupo',
      message: `¿Cancelar "${g.name}"? Nadie más podrá unirse y no se puede deshacer.`,
      buttons: [
        { text: 'Volver', role: 'cancel' },
        { text: 'Cancelar grupo', role: 'destructive' },
      ],
    });
    await alert.present();
    const { role } = await alert.onDidDismiss();
    if (role !== 'destructive') return;
    await this.manage(() => this.store.cancelGroup(), 'Grupo cancelado');
  }

  private async manage(action: () => Promise<void>, done: string): Promise<void> {
    this.managing.set(true);
    try {
      await action();
      void this.toast.show(done, 'success');
    } catch (error) {
      void this.toast.show(toApiError(error).message, 'danger');
    } finally {
      this.managing.set(false);
    }
  }

  /** Mientras la pantalla está abierta, revisa cambios de la cadena (aportes de otros, cobros). */
  private refreshTimer: ReturnType<typeof setInterval> | undefined;

  /** Encabezado índigo: la barra de estado del sistema combina con él. */
  ionViewWillEnter(): void {
    this.theme.setHeaderTone('brand');
    clearInterval(this.refreshTimer);
    this.refreshTimer = setInterval(() => {
      const status = this.store.group()?.status;
      if (status && status !== 'COMPLETED') this.store.refreshGroup();
    }, REFRESH_MS);
  }

  ionViewWillLeave(): void {
    this.theme.setHeaderTone('surface');
    clearInterval(this.refreshTimer);
  }

  constructor() {
    // Solo el id de la ruta dispara la carga: untracked evita que el effect se
    // suscriba al grupo del store (que loadGroup lee) y se repita al cambiar.
    effect(() => {
      const id = this.id();
      untracked(() => void this.store.loadGroup(id));
    });
  }

  /** Comparte la invitación con el menú del sistema, o la copia si no hay menú. */
  protected async shareInvite(group: Group): Promise<void> {
    if (group.organizerUserId && !(await this.inviteByPhone())) {
      return;
    }
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

  /** Con la API real, invitar es registrar el celular en el contrato. */
  private async inviteByPhone(): Promise<boolean> {
    const alert = await this.alerts.create({
      header: 'Invitar por celular',
      message: 'La persona ya debe tener una cuenta en Pasanaku.',
      inputs: [{ name: 'phone', type: 'tel', placeholder: '71234567', attributes: { 'aria-label': 'Celular' } }],
      buttons: [
        { text: 'Cancelar', role: 'cancel' },
        { text: 'Invitar', role: 'confirm' },
      ],
    });
    await alert.present();
    const { role, data } = await alert.onDidDismiss<{ values: { phone: string } }>();
    const phone = data?.values.phone.trim();
    if (role !== 'confirm' || !phone) {
      return false;
    }
    try {
      await this.store.inviteByPhone(phone);
      void this.toast.show('Invitación registrada', 'success');
      return true;
    } catch (error) {
      void this.toast.show(toApiError(error).message, 'danger');
      return false;
    }
  }

  protected retry(): void {
    void this.store.loadGroup(this.id());
  }
}
