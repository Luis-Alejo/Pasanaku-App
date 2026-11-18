import { Component, computed, input } from '@angular/core';
import type { MoneyAsset } from '@shared/pipes/money.pipe';
import { formatMoneyParts } from '@shared/pipes/money.pipe';

/**
 * Tarjeta de saldo del kit (la tarjeta con degradado índigo), sin números de
 * tarjeta ni logos: muestra un monto destacado con su etiqueta, un texto de
 * apoyo opcional y, si se quiere, un dato extra arriba a la derecha (`meta`).
 */
@Component({
  selector: 'app-amount-card',
  templateUrl: './amount-card.component.html',
  styleUrls: ['./amount-card.component.scss'],
})
export class AmountCardComponent {
  readonly label = input.required<string>();
  readonly amount = input.required<string | number>();
  readonly asset = input.required<MoneyAsset>();
  /** Texto de apoyo opcional bajo el monto (ej. "4 de 6 aportes"). */
  readonly caption = input<string>();
  /** Dato corto arriba a la derecha (ej. "Ronda 3 de 6"). */
  readonly meta = input<string>();

  /**
   * Número y código por separado: el salto de línea solo puede caer entre
   * ellos o después de un punto de miles, nunca en medio de los dígitos.
   */
  protected readonly parts = computed(() => {
    const p = formatMoneyParts(this.amount(), this.asset());
    return p ? { groups: p.number.split(/(?<=\.)/), code: p.code } : null;
  });
}
