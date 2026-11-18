import { Component, computed, input } from '@angular/core';

/** Estado de un pago: pagado, pendiente o atrasado. */
export type PaymentStatus = 'PAID' | 'PENDING' | 'LATE';

const STATUS_CONFIG: Record<PaymentStatus, { label: string; tone: 'success' | 'warning' | 'danger' }> = {
  PAID: { label: 'Pagado', tone: 'success' },
  PENDING: { label: 'Pendiente', tone: 'warning' },
  LATE: { label: 'Atrasado', tone: 'danger' },
};

/**
 * Etiqueta de estado de un pago (fondo suave + texto oscuro del mismo color en
 * claro; color lleno en oscuro). El color acompaña al texto, nunca lo reemplaza.
 */
@Component({
  selector: 'app-payment-status-badge',
  templateUrl: './payment-status-badge.component.html',
  styleUrls: ['./payment-status-badge.component.scss'],
})
export class PaymentStatusBadgeComponent {
  readonly status = input.required<PaymentStatus>();

  protected readonly config = computed(() => STATUS_CONFIG[this.status()]);
}
