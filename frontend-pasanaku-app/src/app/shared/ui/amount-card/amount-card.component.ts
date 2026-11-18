import { Component, computed, input } from '@angular/core';
import { IonCard, IonCardContent, IonCardHeader, IonCardSubtitle, IonCardTitle } from '@ionic/angular';
import type { MoneyAsset } from '@shared/pipes/money.pipe';
import { formatMoneyParts } from '@shared/pipes/money.pipe';

/** Tarjeta que muestra un monto destacado con su etiqueta (ej. "Fondo de la ronda"). */
@Component({
  selector: 'app-amount-card',
  templateUrl: './amount-card.component.html',
  styleUrls: ['./amount-card.component.scss'],
  imports: [IonCard, IonCardHeader, IonCardSubtitle, IonCardTitle, IonCardContent],
})
export class AmountCardComponent {
  readonly label = input.required<string>();
  readonly amount = input.required<string | number>();
  readonly asset = input.required<MoneyAsset>();
  /** Texto de apoyo opcional bajo el monto (ej. "4 de 6 aportes"). */
  readonly caption = input<string>();

  /**
   * Número y código por separado: el salto de línea solo puede caer entre
   * ellos o después de un punto de miles, nunca en medio de los dígitos.
   */
  protected readonly parts = computed(() => {
    const p = formatMoneyParts(this.amount(), this.asset());
    return p ? { groups: p.number.split(/(?<=\.)/), code: p.code } : null;
  });
}
