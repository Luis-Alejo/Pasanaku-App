import { Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';

import { BrandHeaderComponent } from './brand-header.component';

@Component({
  imports: [BrandHeaderComponent],
  template: `
    <app-brand-header>
      <h1>Hola, Ana</h1>
      <div pkOverlap class="card">Tarjeta</div>
    </app-brand-header>
  `,
})
class HostComponent {}

describe('BrandHeaderComponent', () => {
  it('pone el título en la franja y la tarjeta en la zona superpuesta', () => {
    const fixture = TestBed.createComponent(HostComponent);
    fixture.detectChanges();
    const el = fixture.nativeElement as HTMLElement;
    expect(el.querySelector('.band h1')?.textContent).toBe('Hola, Ana');
    expect(el.querySelector('.overlap .card')?.textContent).toBe('Tarjeta');
  });
});
