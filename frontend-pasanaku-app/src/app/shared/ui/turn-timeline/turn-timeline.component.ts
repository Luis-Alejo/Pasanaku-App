import { Component, input } from '@angular/core';
import { IonIcon } from '@ionic/angular';
import { initials } from '@shared/utils/initials';
import { checkmark } from 'ionicons/icons';

/** Estado de un paso de la línea: ya pasó, es el actual o viene después. */
export type TimelineStepState = 'done' | 'current' | 'upcoming';

export interface TimelineStep {
  /** Identificador estable (para `track`). */
  id: string;
  title: string;
  subtitle?: string;
  state: TimelineStepState;
  /** Resalta el paso (ej. el turno del usuario). */
  highlight?: boolean;
  /**
   * Nombre para el avatar con iniciales (ej. el miembro que cobra). Sin él,
   * el marcador muestra el número del paso.
   */
  avatarName?: string;
}

const STATE_LABELS: Record<TimelineStepState, string> = {
  done: 'Completado',
  current: 'En curso',
  upcoming: 'Pendiente',
};

/**
 * Línea de pasos en orden (ej. la línea de turnos de un grupo).
 * Es una lista ordenada; el paso actual lleva `aria-current="step"` y cada
 * estado se anuncia en texto, no solo con color.
 */
@Component({
  selector: 'app-turn-timeline',
  templateUrl: './turn-timeline.component.html',
  styleUrls: ['./turn-timeline.component.scss'],
  imports: [IonIcon],
})
export class TurnTimelineComponent {
  readonly steps = input.required<TimelineStep[]>();
  /** Nombre accesible de la lista (ej. "Orden de cobro"). */
  readonly label = input.required<string>();
  /** Texto de la marca del paso resaltado. */
  readonly highlightLabel = input('Tú');

  protected readonly checkIcon = checkmark;
  protected readonly stateLabels = STATE_LABELS;
  protected readonly initials = initials;
}
