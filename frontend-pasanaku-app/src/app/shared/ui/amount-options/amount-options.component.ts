import { Component, input, model } from '@angular/core';

export interface AmountOption {
  /** Valor que se guarda (ej. "500"). */
  value: string;
  /** Texto visible (ej. "500 BOB"). */
  label: string;
}

let nextId = 0;

/**
 * Montos rápidos del kit (Amount / Default · Active): un grupo de opciones
 * excluyentes. Por dentro son radios nativos, así que funciona con teclado
 * (flechas) y lectores de pantalla sin código extra.
 */
@Component({
  selector: 'app-amount-options',
  templateUrl: './amount-options.component.html',
  styleUrls: ['./amount-options.component.scss'],
})
export class AmountOptionsComponent {
  readonly options = input.required<AmountOption[]>();
  /** Texto del grupo (se muestra como leyenda). */
  readonly legend = input.required<string>();
  /** Valor elegido; null si ninguno coincide (ej. la persona escribió otro monto). */
  readonly value = model<string | null>(null);

  protected readonly name = `pk-amount-${nextId++}`;
}
