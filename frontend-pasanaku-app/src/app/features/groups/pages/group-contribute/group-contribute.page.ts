import { Component, computed, effect, inject, input, signal, untracked } from '@angular/core';
import { RouterLink } from '@angular/router';
import type { ContributeResult, ContributionErrorCode, QrPayment } from '@core/models/domain.models';
import { ContributionError } from '@core/models/domain.models';
import { explorerTxUrl, shortHash } from '@core/stellar/explorer';
import {
  IonBackButton,
  IonButton,
  IonButtons,
  IonContent,
  IonHeader,
  IonIcon,
  IonSpinner,
  IonTitle,
  IonToolbar,
} from '@ionic/angular';
import { MoneyPipe } from '@shared/pipes/money.pipe';
import { AmountCardComponent } from '@shared/ui/amount-card/amount-card.component';
import { EmptyStateComponent } from '@shared/ui/empty-state/empty-state.component';
import { InfoRowComponent } from '@shared/ui/info-row/info-row.component';
import { QrCodeComponent } from '@shared/ui/qr-code/qr-code.component';
import { todayIso } from '@shared/utils/date';
import { formatDate } from '@shared/utils/format';
import {
  alertCircleOutline,
  checkmarkCircle,
  cloudOfflineOutline,
  flagOutline,
  helpCircleOutline,
  openOutline,
} from 'ionicons/icons';

import { myMember } from '../../data-access/group-view';
import { GroupsStore } from '../../data-access/groups.store';

type Phase = 'review' | 'sending' | 'qr' | 'done' | 'failed';

/** Moneda local para mostrar el monto del QR. */
const BOB = { code: 'Bs', decimals: 2 };

const CONTRIBUTION_ERRORS: Record<ContributionErrorCode, string> = {
  NOT_FOUND: 'Este grupo ya no existe.',
  NOT_MEMBER: 'Solo los miembros del grupo pueden aportar.',
  NOT_ACTIVE: 'El grupo no tiene una ronda abierta en este momento.',
  ALREADY_PAID: 'Ya registraste tu aporte en esta ronda.',
};

/** Registrar el aporte de la ronda en curso y ver el estado de la transacción en Testnet. */
@Component({
  selector: 'app-group-contribute',
  templateUrl: './group-contribute.page.html',
  styleUrls: ['./group-contribute.page.scss'],
  imports: [
    RouterLink,
    IonHeader,
    IonToolbar,
    IonTitle,
    IonButtons,
    IonBackButton,
    IonContent,
    IonButton,
    IonIcon,
    IonSpinner,
    MoneyPipe,
    AmountCardComponent,
    EmptyStateComponent,
    InfoRowComponent,
    QrCodeComponent,
  ],
})
export class GroupContributePage {
  protected readonly store = inject(GroupsStore);

  /** De la ruta /tabs/groups/:id/contribute */
  readonly id = input.required<string>();

  protected readonly phase = signal<Phase>('review');
  protected readonly result = signal<ContributeResult | null>(null);
  protected readonly errorMessage = signal('');
  /** QR en bolivianos que se está pagando (Pollar). */
  protected readonly qr = signal<QrPayment | null>(null);
  protected readonly sendingText = signal('Procesando en Stellar Testnet…');
  protected readonly bob = BOB;

  protected readonly icons = {
    error: cloudOfflineOutline,
    notFound: helpCircleOutline,
    closed: flagOutline,
    ok: checkmarkCircle,
    failed: alertCircleOutline,
    external: openOutline,
  };
  protected readonly formatDate = formatDate;
  protected readonly shortHash = shortHash;
  protected readonly txUrl = explorerTxUrl;

  protected readonly group = this.store.group;

  protected readonly me = computed(() => {
    const g = this.group();
    return g ? (myMember(g, this.store.currentUserId()) ?? null) : null;
  });

  protected readonly round = computed(() => {
    const g = this.group();
    return g?.rounds.find((r) => r.number === g.currentRound) ?? null;
  });

  protected readonly recipientName = computed(() => {
    const g = this.group();
    const r = this.round();
    return g && r ? (g.members.find((m) => m.id === r.recipientMemberId)?.displayName ?? '') : '';
  });

  protected readonly recipientIsMe = computed(() => this.round()?.recipientMemberId === this.me()?.id);

  /** Mi aporte en la ronda en curso (si ya existe un registro). */
  protected readonly myContribution = computed(() => {
    const r = this.round();
    const me = this.me();
    return r && me
      ? (this.store.contributions().find((c) => c.roundNumber === r.number && c.memberId === me.id) ?? null)
      : null;
  });

  protected readonly isLate = computed(() => {
    const r = this.round();
    return this.myContribution()?.status === 'LATE' || (!!r && r.dueDate < todayIso());
  });

  protected readonly payoutRecipient = computed(() => {
    const payout = this.result()?.payout;
    const g = this.result()?.group;
    if (!payout || !g) return '';
    const m = g.members.find((x) => x.id === payout.recipientMemberId);
    return m?.userId === this.store.currentUserId()
      ? 'Tú recibiste'
      : `${m?.displayName ?? 'El miembro del turno'} recibió`;
  });

  constructor() {
    // Solo el id de la ruta dispara la carga: untracked evita que el effect se
    // suscriba al grupo del store y vuelva a "revisión" cuando el aporte lo actualiza.
    effect(() => {
      const id = this.id();
      untracked(() => {
        this.phase.set('review');
        this.result.set(null);
        void this.store.loadGroup(id);
      });
    });
  }

  protected retryLoad(): void {
    void this.store.loadGroup(this.id());
  }

  protected async send(): Promise<void> {
    if (this.phase() === 'sending') return;
    this.sendingText.set('Procesando en Stellar Testnet…');
    this.phase.set('sending');
    try {
      this.result.set(await this.store.contribute());
      this.phase.set('done');
    } catch (error) {
      this.errorMessage.set(
        error instanceof ContributionError
          ? (error.detail ?? CONTRIBUTION_ERRORS[error.code])
          : 'La transacción no se pudo enviar. Revisa tu conexión e inténtalo de nuevo.',
      );
      this.phase.set('failed');
    }
  }

  protected async payWithQr(): Promise<void> {
    if (this.phase() === 'sending') return;
    this.sendingText.set('Generando tu QR…');
    this.phase.set('sending');
    try {
      this.qr.set(await this.store.startQrContribution());
      this.phase.set('qr');
    } catch (error) {
      this.fail(error);
    }
  }

  /** En simulación el QR se da por pagado; en real se espera la confirmación del banco. */
  protected async confirmQr(): Promise<void> {
    const qr = this.qr();
    const round = this.round();
    if (!qr || !round) return;
    this.sendingText.set(qr.simulated ? 'Simulando el pago y aportando en Stellar…' : 'Confirmando tu pago…');
    this.phase.set('sending');
    try {
      if (qr.simulated) {
        await this.store.simulateQrPayment(qr.reference);
      }
      this.result.set(await this.store.confirmQrContribution(round.number));
      this.phase.set('done');
    } catch (error) {
      this.fail(error);
    }
  }

  private fail(error: unknown): void {
    this.errorMessage.set(
      error instanceof ContributionError
        ? (error.detail ?? CONTRIBUTION_ERRORS[error.code])
        : 'No se pudo completar el pago. Revisa tu conexión e inténtalo de nuevo.',
    );
    this.phase.set('failed');
  }

  protected backToReview(): void {
    this.qr.set(null);
    this.phase.set('review');
    void this.store.loadGroup(this.id());
  }
}
