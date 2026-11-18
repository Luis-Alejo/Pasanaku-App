import { Component, input } from '@angular/core';
import { IonIcon } from '@ionic/angular';

/**
 * Estado vacío: un ícono, un título y un mensaje opcional.
 * La acción (botón) se pasa como contenido: `<app-empty-state ...><ion-button>...</ion-button></app-empty-state>`.
 */
@Component({
  selector: 'app-empty-state',
  templateUrl: './empty-state.component.html',
  styleUrls: ['./empty-state.component.scss'],
  imports: [IonIcon],
})
export class EmptyStateComponent {
  /** Ícono ya importado de 'ionicons/icons' (ej. `peopleOutline`). */
  readonly icon = input<string>();
  readonly title = input.required<string>();
  readonly message = input<string>();
}
