import { TestBed } from '@angular/core/testing';

import { PaymentStatusBadgeComponent } from './payment-status-badge.component';

describe('PaymentStatusBadgeComponent', () => {
  it.each([
    ['PAID', 'Pagado', 'success'],
    ['PENDING', 'Pendiente', 'warning'],
    ['LATE', 'Atrasado', 'danger'],
  ] as const)('muestra %s como "%s" con el tono %s', (status, label, tone) => {
    const fixture = TestBed.createComponent(PaymentStatusBadgeComponent);
    fixture.componentRef.setInput('status', status);
    fixture.detectChanges();

    const badge = fixture.nativeElement.querySelector('.badge') as HTMLElement;
    expect(badge.textContent?.trim()).toBe(label);
    expect(badge.classList.contains(`badge--${tone}`)).toBe(true);
  });
});
