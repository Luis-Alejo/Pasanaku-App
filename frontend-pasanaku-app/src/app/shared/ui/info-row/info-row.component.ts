import { Component, input } from '@angular/core';

/**
 * Fila "etiqueta / valor" del kit (Row / Information). El valor puede ir en
 * índigo (`tone="brand"`) o con el color de texto normal.
 * Si el valor necesita marcado propio, se pasa como contenido en vez de `value`.
 */
@Component({
  selector: 'app-info-row',
  templateUrl: './info-row.component.html',
  styleUrls: ['./info-row.component.scss'],
})
export class InfoRowComponent {
  readonly label = input.required<string>();
  readonly value = input<string>();
  readonly tone = input<'default' | 'brand'>('default');
}
