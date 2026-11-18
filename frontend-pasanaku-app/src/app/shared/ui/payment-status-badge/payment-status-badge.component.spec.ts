import { TestBed } from '@angular/core/testing';

import { PaymentStatusBadgeComponent } from './payment-status-badge.component';

describe('PaymentStatusBadgeComponent', () => {
  it.each([
    ['PAID', 'Pagado', 'success'],
    ['PENDING', 'Pendiente', 'warning'],
    ['LATE', 'Atrasado', 'danger'],
  ] as const)('muestra %s como "%s" en color %s', (status, label, color) => {
    const fixture = TestBed.createComponent(PaymentStatusBadgeComponent);
    fixture.componentRef.setInput('status', status);
    fixture.detectChanges();

    const badge = fixture.nativeElement.querySelector('ion-badge') as HTMLElement & { color?: string };
    expect(badge.textContent?.trim()).toBe(label);
    expect(badge.color).toBe(color);
  });
});
