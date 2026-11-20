import { Component, computed, effect, inject, input, signal, untracked } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { FormControl, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '@core/auth/auth.service';
import type { JoinGroupErrorCode } from '@core/models/domain.models';
import { JoinGroupError } from '@core/models/domain.models';
import { REPUTATION, canUsePublicGroups } from '@core/models/reputation';
import { ToastService } from '@core/services/toast.service';
import {
  IonBackButton,
  IonButton,
  IonButtons,
  IonCheckbox,
  IonContent,
  IonHeader,
  IonSpinner,
  IonTitle,
  IonToolbar,
} from '@ionic/angular';
import { MoneyPipe } from '@shared/pipes/money.pipe';
import { EmptyStateComponent } from '@shared/ui/empty-state/empty-state.component';
import { InfoRowComponent } from '@shared/ui/info-row/info-row.component';
import { multiplyAmount } from '@shared/utils/format';
import { checkmarkCircleOutline, cloudOfflineOutline, lockClosedOutline, searchOutline } from 'ionicons/icons';

import { VISIBILITY_LABELS, myMember, periodicityLabel, turnModeLabel } from '../../data-access/group-view';
import { GroupsStore } from '../../data-access/groups.store';

const JOIN_ERRORS: Record<JoinGroupErrorCode, string> = {
  NOT_FOUND: 'Este grupo ya no existe.',
  ALREADY_MEMBER: 'Ya eres parte de este grupo.',
  FULL: 'El grupo se llenó antes de que pudieras unirte.',
  CLOSED: 'Este grupo ya no acepta miembros.',
  LOW_REPUTATION: `Tu reputación es de ${REPUTATION.publicLimit} o menos: no puedes unirte a grupos públicos.`,
};

/**
 * Unirse a un grupo: resumen de reglas, aceptar condiciones y unirse.
 * Rutas: /join/:code (invitación) y /tabs/groups/:id/join (desde Públicos).
 */
@Component({
  selector: 'app-join-group',
  templateUrl: './join-group.page.html',
  styleUrls: ['./join-group.page.scss'],
  imports: [
    ReactiveFormsModule,
    RouterLink,
    IonHeader,
    IonToolbar,
    IonTitle,
    IonButtons,
    IonBackButton,
    IonContent,
    IonCheckbox,
    IonButton,
    IonSpinner,
    MoneyPipe,
    EmptyStateComponent,
    InfoRowComponent,
  ],
})
export class JoinGroupPage {
  protected readonly store = inject(GroupsStore);
  private readonly router = inject(Router);
  private readonly toast = inject(ToastService);
  private readonly auth = inject(AuthService);

  /** De /join/:code */
  readonly code = input<string>();
  /** De /tabs/groups/:id/join */
  readonly id = input<string>();

  protected readonly accept = new FormControl(false, { nonNullable: true, validators: [Validators.requiredTrue] });
  protected readonly joining = signal(false);
  /** El botón de unirse se habilita al marcar "Acepto las condiciones". */
  protected readonly accepted = toSignal(this.accept.valueChanges, { initialValue: this.accept.value });

  protected readonly turnModeLabel = turnModeLabel;
  protected readonly periodicityLabel = periodicityLabel;
  protected readonly labels = {
    visibility: VISIBILITY_LABELS,
  };
  protected readonly icons = {
    error: cloudOfflineOutline,
    notFound: searchOutline,
    member: checkmarkCircleOutline,
    closed: lockClosedOutline,
  };

  protected readonly group = this.store.joinTarget;

  protected readonly isMember = computed(() => {
    const g = this.group();
    return !!g && !!myMember(g, this.store.currentUserId());
  });

  /** Por qué no se puede unir (null si sí se puede). */
  protected readonly blocked = computed<JoinGroupErrorCode | null>(() => {
    const g = this.group();
    if (!g) return null;
    if (this.isMember()) return 'ALREADY_MEMBER';
    if (g.memberCount === 0) return null; // privado sin vista previa
    if (g.status !== 'FORMING') return 'CLOSED';
    if (g.members.length >= g.memberCount) return 'FULL';
    if (g.visibility === 'PUBLIC' && !canUsePublicGroups(this.auth.currentUser()?.reputation)) {
      return 'LOW_REPUTATION';
    }
    return null;
  });

  protected readonly payout = computed(() => {
    const g = this.group();
    return g ? multiplyAmount(g.contributionAmount, g.memberCount, g.asset.decimals) : '0';
  });

  constructor() {
    effect(() => {
      const code = this.code();
      const id = this.id();
      untracked(() => {
        if (code) {
          void this.store.loadJoinTarget({ code });
        } else if (id) {
          void this.store.loadJoinTarget({ id });
        }
      });
    });
  }

  protected blockedMessage(code: JoinGroupErrorCode): string {
    return JOIN_ERRORS[code];
  }

  protected retry(): void {
    const code = this.code();
    const id = this.id();
    void this.store.loadJoinTarget(code ? { code } : { id: id ?? '' });
  }

  protected async join(): Promise<void> {
    const g = this.group();
    if (!g || this.joining()) {
      return;
    }
    if (this.accept.invalid) {
      this.accept.markAsTouched();
      return;
    }
    this.joining.set(true);
    try {
      await this.store.joinGroup(g.id);
      void this.toast.show(`Te uniste a ${g.name}`, 'success');
      await this.router.navigate(['/tabs/groups', g.id], { replaceUrl: true });
    } catch (error) {
      const message =
        error instanceof JoinGroupError
          ? (error.detail ?? JOIN_ERRORS[error.code])
          : 'No pudimos unirte al grupo. Inténtalo de nuevo.';
      void this.toast.show(message, 'danger');
      // Refresca el grupo: puede que ya esté lleno o cerrado.
      this.retry();
    } finally {
      this.joining.set(false);
    }
  }
}
