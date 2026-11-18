import { Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';

import { EmptyStateComponent } from './empty-state.component';

@Component({
  imports: [EmptyStateComponent],
  template: `
    <app-empty-state title="Aún no tienes grupos" message="Crea uno o únete con un código.">
      <button type="button">Crear grupo</button>
    </app-empty-state>
    <app-empty-state class="with-art" illustration="ahorro-colectivo" title="Sin movimientos" />
  `,
})
class HostComponent {}

describe('EmptyStateComponent', () => {
  function render() {
    const fixture = TestBed.createComponent(HostComponent);
    fixture.detectChanges();
    return fixture.nativeElement as HTMLElement;
  }

  it('muestra título, mensaje y la acción proyectada', () => {
    const el = render();
    expect(el.querySelector('.title')?.textContent?.trim()).toBe('Aún no tienes grupos');
    expect(el.querySelector('.message')?.textContent?.trim()).toBe('Crea uno o únete con un código.');
    expect(el.querySelector('.action button')?.textContent?.trim()).toBe('Crear grupo');
    expect(el.querySelector('ion-icon')).toBeNull();
  });

  it('muestra la ilustración del kit como imagen decorativa', () => {
    const img = render().querySelector('.with-art img') as HTMLImageElement;
    expect(img.getAttribute('src')).toBe('assets/illustrations/ahorro-colectivo.svg');
    expect(img.getAttribute('alt')).toBe('');
  });
});
