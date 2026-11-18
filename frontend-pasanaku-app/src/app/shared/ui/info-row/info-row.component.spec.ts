import { TestBed } from '@angular/core/testing';

import { InfoRowComponent } from './info-row.component';

describe('InfoRowComponent', () => {
  it('muestra etiqueta y valor con el tono pedido', () => {
    const fixture = TestBed.createComponent(InfoRowComponent);
    fixture.componentRef.setInput('label', 'Aporte');
    fixture.componentRef.setInput('value', '500,00 BOB');
    fixture.componentRef.setInput('tone', 'brand');
    fixture.detectChanges();
    const el = fixture.nativeElement as HTMLElement;
    expect(el.querySelector('.label')?.textContent?.trim()).toBe('Aporte');
    expect(el.querySelector('.value')?.textContent?.trim()).toBe('500,00 BOB');
    expect(el.querySelector('.value--brand')).not.toBeNull();
  });
});
