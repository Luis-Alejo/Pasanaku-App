import { Component, computed, effect, inject, input, signal } from '@angular/core';
import type { Member, TurnErrorCode } from '@core/models/domain.models';
import { TurnError } from '@core/models/domain.models';
import { ToastService } from '@core/services/toast.service';
import {
  AlertController,
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
import { EmptyStateComponent } from '@shared/ui/empty-state/empty-state.component';
import { TurnTimelineComponent } from '@shared/ui/turn-timeline/turn-timeline.component';
import { formatDate } from '@shared/utils/format';
import { cloudOfflineOutline, helpCircleOutline, hourglassOutline } from 'ionicons/icons';

import {
  describeSwap,
  incomingProposals,
  myMember,
  swapCandidates,
  swapStatusLabel,
  turnSlots,
  turnSteps,
} from '../../data-access/group-view';
import { GroupsStore } from '../../data-access/groups.store';

const TURN_ERRORS: Record<TurnErrorCode, string> = {
  NOT_FOUND: 'Ese grupo o propuesta ya no existe.',
  NOT_MEMBER: 'Solo los miembros del grupo pueden hacer esto.',
  NOT_ALLOWED: 'El grupo ya no está en esta etapa. Actualizamos la pantalla.',
  TURN_TAKEN: 'Alguien eligió ese turno antes. Elige otro.',
  SWAP_NOT_ALLOWED: 'Ese intercambio ya no es posible: uno de los turnos empezó o ya hay una propuesta pendiente.',
};

/**
 * Turnos de un grupo: elegir turno (acuerdo), sortear (sorteo), ver el orden
 * de cobro y proponer, aceptar o rechazar intercambios.
 */
@Component({
  selector: 'app-group-turns',
  templateUrl: './group-turns.page.html',
  styleUrls: ['./group-turns.page.scss'],
  imports: [
    IonHeader,
    IonToolbar,
    IonTitle,
    IonButtons,
    IonBackButton,
    IonContent,
    IonList,
    IonItem,
    IonLabel,
    IonNote,
    IonButton,
    IonSpinner,
    EmptyStateComponent,
    TurnTimelineComponent,
  ],
})
export class GroupTurnsPage {
  protected readonly store = inject(GroupsStore);
  private readonly toast = inject(ToastService);
  private readonly alerts = inject(AlertController);

  /** De la ruta /tabs/groups/:id/turns */
  readonly id = input.required<string>();

  /** Acción en curso (para no repetirla y mostrar "…"). */
  protected readonly busy = signal<string | null>(null);

  protected readonly icons = { error: cloudOfflineOutline, notFound: helpCircleOutline, waiting: hourglassOutline };
  protected readonly swapStatusLabel = swapStatusLabel;
  protected readonly formatDate = formatDate;

  private readonly userId = this.store.currentUserId;
  protected readonly group = this.store.group;

  protected readonly me = computed(() => {
    const g = this.group();
    return g ? (myMember(g, this.userId()) ?? null) : null;
  });

  protected readonly slots = computed(() => {
    const g = this.group();
    return g ? turnSlots(g, this.userId()) : [];
  });

  protected readonly chosenCount = computed(() => this.slots().filter((s) => s.member).length);

  protected readonly steps = computed(() => {
    const g = this.group();
    return g ? turnSteps(g, this.userId()) : [];
  });

  protected readonly incoming = computed(() => {
    const g = this.group();
    return g
      ? incomingProposals(g, this.store.swaps(), this.userId()).map((s) => ({
          swap: s,
          view: describeSwap(s, g, this.userId()),
        }))
      : [];
  });

  protected readonly candidates = computed(() => {
    const g = this.group();
    return g ? swapCandidates(g, this.store.swaps(), this.userId()) : [];
  });

  /** Propuestas ya respondidas o enviadas por el usuario (lo que no requiere acción). */
  protected readonly history = computed(() => {
    const g = this.group();
    if (!g) return [];
    return this.store
      .swaps()
      .map((s) => describeSwap(s, g, this.userId()))
      .filter((v) => !(v.direction === 'incoming' && v.status === 'PROPOSED'))
      .reverse();
  });

  constructor() {
    effect(() => {
      void this.store.loadGroup(this.id());
    });
  }

  protected retry(): void {
    void this.store.loadGroup(this.id());
  }

  protected async choose(turn: number): Promise<void> {
    await this.run(`turn-${turn}`, async () => {
      const group = await this.store.chooseTurn(turn);
      if (group.status === 'ACTIVE') {
        void this.toast.show('¡Todos eligieron! El grupo empezó.', 'success');
      } else {
        void this.toast.show(`Elegiste el turno ${turn}`, 'success');
      }
    });
  }

  protected async draw(): Promise<void> {
    await this.run('draw', async () => {
      const group = await this.store.runDraw();
      const mine = myMember(group, this.userId());
      void this.toast.show(
        mine?.turnNumber ? `Sorteo listo: te tocó el turno ${mine.turnNumber}` : 'Sorteo listo',
        'success',
      );
    });
  }

  protected async propose(other: Member): Promise<void> {
    const me = this.me();
    if (!me) return;
    const alert = await this.alerts.create({
      header: 'Proponer intercambio',
      message: `¿Proponer a ${other.displayName} cambiar tu turno ${me.turnNumber} por su turno ${other.turnNumber}?`,
      buttons: [
        { text: 'Cancelar', role: 'cancel' },
        { text: 'Proponer', role: 'confirm' },
      ],
    });
    await alert.present();
    const { role } = await alert.onDidDismiss();
    if (role !== 'confirm') return;
    await this.run(`propose-${other.id}`, async () => {
      await this.store.proposeSwap(other.id);
      void this.toast.show(`Propuesta enviada a ${other.displayName}`, 'success');
    });
  }

  protected async respond(swapId: string, accept: boolean): Promise<void> {
    await this.run(`${accept ? 'accept' : 'reject'}-${swapId}`, async () => {
      await this.store.respondSwap(swapId, accept);
      void this.toast.show(
        accept ? 'Intercambio aceptado: tu turno cambió' : 'Propuesta rechazada',
        accept ? 'success' : 'medium',
      );
    });
  }

  /** Ejecuta una acción una sola vez a la vez y muestra el error entendible si falla. */
  private async run(key: string, action: () => Promise<void>): Promise<void> {
    if (this.busy()) return;
    this.busy.set(key);
    try {
      await action();
    } catch (error) {
      const message = error instanceof TurnError ? TURN_ERRORS[error.code] : 'Algo salió mal. Inténtalo de nuevo.';
      void this.toast.show(message, 'danger');
      // El estado del grupo pudo cambiar: recargar.
      void this.store.loadGroup(this.id());
    } finally {
      this.busy.set(null);
    }
  }
}
