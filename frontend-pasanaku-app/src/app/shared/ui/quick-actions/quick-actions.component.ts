import { NgTemplateOutlet } from '@angular/common';
import { Component, input, output } from '@angular/core';
import { RouterLink } from '@angular/router';
import { IonIcon } from '@ionic/angular';

/** Colores vivos del kit para el ícono (solo decorativo; el texto va aparte). */
export type QuickActionAccent = 'indigo' | 'teal' | 'yellow' | 'pink' | 'blue' | 'orange';

export interface QuickAction {
  id: string;
  label: string;
  /** Ícono ya importado de 'ionicons/icons'. */
  icon: string;
  accent: QuickActionAccent;
  /** Si tiene enlace, navega; si no, avisa con `selected`. */
  link?: string | unknown[];
  /** Aviso numérico (ej. propuestas pendientes). */
  badge?: number;
}

/**
 * Cuadrícula de accesos rápidos del kit (tarjetas con ícono de color + texto).
 * Cada acceso es un enlace o un botón real, con área táctil amplia.
 */
@Component({
  selector: 'app-quick-actions',
  templateUrl: './quick-actions.component.html',
  styleUrls: ['./quick-actions.component.scss'],
  imports: [NgTemplateOutlet, RouterLink, IonIcon],
})
export class QuickActionsComponent {
  readonly actions = input.required<QuickAction[]>();
  /** Nombre accesible del grupo de accesos. */
  readonly label = input('Accesos rápidos');
  readonly selected = output<string>();
}
