import { Component, input } from '@angular/core';
import { IonIcon } from '@ionic/angular';

/** Ilustraciones del kit disponibles en `src/assets/illustrations/`. */
export type EmptyStateIllustration = 'ahorro-colectivo' | 'alcancia' | 'billetera';

/**
 * Estado vacío: una ilustración del kit (o un ícono), un título y un mensaje
 * opcional. La acción (botón) se pasa como contenido:
 * `<app-empty-state ...><ion-button>...</ion-button></app-empty-state>`.
 */
@Component({
  selector: 'app-empty-state',
  templateUrl: './empty-state.component.html',
  styleUrls: ['./empty-state.component.scss'],
  imports: [IonIcon],
})
export class EmptyStateComponent {
  /** Ilustración del kit; tiene prioridad sobre `icon`. Es decorativa. */
  readonly illustration = input<EmptyStateIllustration>();
  /** Ícono ya importado de 'ionicons/icons' (ej. `peopleOutline`). */
  readonly icon = input<string>();
  readonly title = input.required<string>();
  readonly message = input<string>();
}
