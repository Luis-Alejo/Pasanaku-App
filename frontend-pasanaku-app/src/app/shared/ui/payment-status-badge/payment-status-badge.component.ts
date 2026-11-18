import { Component, computed, input } from '@angular/core';
import { IonBadge } from '@ionic/angular';

/** Estado de un pago: pagado, pendiente o atrasado. */
export type PaymentStatus = 'PAID' | 'PENDING' | 'LATE';

const STATUS_CONFIG: Record<PaymentStatus, { label: string; color: 'success' | 'warning' | 'danger' }> = {
  PAID: { label: 'Pagado', color: 'success' },
  PENDING: { label: 'Pendiente', color: 'warning' },
  LATE: { label: 'Atrasado', color: 'danger' },
};

/**
 * Etiqueta de estado de un pago. El color acompaña al texto, nunca lo
 * reemplaza: el estado se entiende también sin ver colores.
 */
@Component({
  selector: 'app-payment-status-badge',
  templateUrl: './payment-status-badge.component.html',
  styleUrls: ['./payment-status-badge.component.scss'],
  imports: [IonBadge],
})
export class PaymentStatusBadgeComponent {
  readonly status = input.required<PaymentStatus>();

  protected readonly config = computed(() => STATUS_CONFIG[this.status()]);
}
