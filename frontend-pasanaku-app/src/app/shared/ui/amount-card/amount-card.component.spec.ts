import { TestBed } from '@angular/core/testing';

import { AmountCardComponent } from './amount-card.component';

describe('AmountCardComponent', () => {
  function render(caption?: string, amount = '3000.0000000') {
    const fixture = TestBed.createComponent(AmountCardComponent);
    fixture.componentRef.setInput('label', 'Fondo de la ronda');
    fixture.componentRef.setInput('amount', amount);
    fixture.componentRef.setInput('asset', { code: 'BOB', decimals: 7 });
    if (caption) {
      fixture.componentRef.setInput('caption', caption);
    }
    fixture.detectChanges();
    return fixture.nativeElement as HTMLElement;
  }

  it('muestra la etiqueta y el monto con su moneda', () => {
    const el = render();
    expect(el.querySelector('.label')?.textContent?.trim()).toBe('Fondo de la ronda');
    expect(el.querySelector('.amount-number')?.textContent?.trim()).toBe('3.000,00');
    expect(el.querySelector('.amount-code')?.textContent?.trim()).toBe('BOB');
    expect(el.querySelector('.caption')).toBeNull();
    expect(el.querySelector('section')?.getAttribute('aria-label')).toBe('Fondo de la ronda');
  });

  it('solo permite saltar de línea después de los puntos de miles', () => {
    const el = render(undefined, '1234567.5');
    expect(el.querySelectorAll('.amount-number wbr').length).toBe(3);
    expect(el.querySelector('.amount-number')?.textContent?.replace(/\s/g, '')).toBe('1.234.567,50');
  });

  it('muestra "—" con texto accesible si el monto no es válido', () => {
    const el = render(undefined, 'NaN');
    expect(el.querySelector('.amount-number')).toBeNull();
    expect(el.querySelector('.amount [aria-hidden="true"]')?.textContent?.trim()).toBe('—');
    expect(el.querySelector('.amount .visually-hidden')?.textContent?.trim()).toBe('Monto no disponible');
  });

  it('muestra el texto de apoyo solo si existe', () => {
    const el = render('4 de 6 aportes');
    expect(el.querySelector('.caption')?.textContent?.trim()).toBe('4 de 6 aportes');
  });
});
