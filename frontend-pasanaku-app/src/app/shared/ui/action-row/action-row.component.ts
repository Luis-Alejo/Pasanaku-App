import { NgTemplateOutlet } from '@angular/common';
import { Component, input } from '@angular/core';
import { RouterLink } from '@angular/router';
import { IonIcon } from '@ionic/angular';
import { chevronForward } from 'ionicons/icons';

import type { QuickActionAccent } from '../quick-actions/quick-actions.component';

/**
 * Fila del kit (Row / Transaction): ícono en cuadro de color, título,
 * subtítulo opcional, valor opcional a la derecha y flecha si navega.
 * Toda la fila es el enlace (área táctil completa).
 */
@Component({
  selector: 'app-action-row',
  templateUrl: './action-row.component.html',
  styleUrls: ['./action-row.component.scss'],
  imports: [NgTemplateOutlet, RouterLink, IonIcon],
})
export class ActionRowComponent {
  /** Ícono ya importado de 'ionicons/icons'. */
  readonly icon = input.required<string>();
  readonly title = input.required<string>();
  readonly subtitle = input<string>();
  /** Valor corto a la derecha (ej. un monto). */
  readonly value = input<string>();
  /** Color del cuadro del ícono. 'brand' = índigo de marca. */
  readonly accent = input<QuickActionAccent | 'brand'>('brand');
  /** Si no hay enlace, la fila es solo informativa. */
  readonly link = input<string | unknown[]>();

  protected readonly chevron = chevronForward;
}
