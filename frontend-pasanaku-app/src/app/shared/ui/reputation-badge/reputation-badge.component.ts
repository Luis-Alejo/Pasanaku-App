import { Component, computed, input } from '@angular/core';
import { IonIcon } from '@ionic/angular';
import { ribbonOutline } from 'ionicons/icons';

export type BadgeTone = 'excellent' | 'good' | 'fair' | 'low';

/**
 * Puntaje con ícono (ej. reputación). Quien lo usa decide el tono; aquí solo se pinta.
 * `onBrand`: versión para las franjas índigo (toma el color del texto de alrededor).
 */
@Component({
  selector: 'app-reputation-badge',
  templateUrl: './reputation-badge.component.html',
  styleUrls: ['./reputation-badge.component.scss'],
  imports: [IonIcon],
  host: { '[class]': "'tone--' + tone() + (onBrand() ? ' on-brand' : '')" },
})
export class ReputationBadgeComponent {
  readonly score = input.required<number>();
  readonly tone = input<BadgeTone>('good');
  /** Texto para lectores de pantalla, ej. "Reputación 120, Buena". */
  readonly label = input<string>('');
  readonly onBrand = input(false);

  protected readonly icon = ribbonOutline;
  protected readonly ariaLabel = computed(() => this.label() || `Reputación ${this.score()}`);
}
