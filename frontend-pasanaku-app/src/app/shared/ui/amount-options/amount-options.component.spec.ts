import { TestBed } from '@angular/core/testing';

import { AmountOptionsComponent } from './amount-options.component';

describe('AmountOptionsComponent', () => {
  it('es un grupo de radios con leyenda y refleja el valor elegido', () => {
    const fixture = TestBed.createComponent(AmountOptionsComponent);
    fixture.componentRef.setInput('legend', 'Montos frecuentes');
    fixture.componentRef.setInput('options', [
      { value: '100', label: '100' },
      { value: '500', label: '500' },
    ]);
    fixture.componentRef.setInput('value', '500');
    fixture.detectChanges();
    const el = fixture.nativeElement as HTMLElement;
    const radios = el.querySelectorAll<HTMLInputElement>('input[type="radio"]');
    expect(el.querySelector('legend')?.textContent?.trim()).toBe('Montos frecuentes');
    expect(radios.length).toBe(2);
    expect(radios[1].checked).toBe(true);

    radios[0].click();
    fixture.detectChanges();
    expect(fixture.componentInstance.value()).toBe('100');
  });
});
