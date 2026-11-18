import { Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';

import { EmptyStateComponent } from './empty-state.component';

@Component({
  imports: [EmptyStateComponent],
  template: `
    <app-empty-state title="Aún no tienes grupos" message="Crea uno o únete con un código.">
      <button type="button">Crear grupo</button>
    </app-empty-state>
  `,
})
class HostComponent {}

describe('EmptyStateComponent', () => {
  it('muestra título, mensaje y la acción proyectada', () => {
    const fixture = TestBed.createComponent(HostComponent);
    fixture.detectChanges();
    const el = fixture.nativeElement as HTMLElement;

    expect(el.querySelector('.title')?.textContent?.trim()).toBe('Aún no tienes grupos');
    expect(el.querySelector('.message')?.textContent?.trim()).toBe('Crea uno o únete con un código.');
    expect(el.querySelector('.action button')?.textContent?.trim()).toBe('Crear grupo');
    expect(el.querySelector('ion-icon')).toBeNull();
  });
});
