import { TestBed } from '@angular/core/testing';

import type { TimelineStep } from './turn-timeline.component';
import { TurnTimelineComponent } from './turn-timeline.component';

const STEPS: TimelineStep[] = [
  { id: '1', title: 'Rosa', subtitle: '15 sep', state: 'done' },
  { id: '2', title: 'Carmen', subtitle: '15 nov', state: 'current' },
  { id: '3', title: 'Ana María', subtitle: '15 dic', state: 'upcoming', highlight: true },
];

describe('TurnTimelineComponent', () => {
  function render(steps: TimelineStep[]) {
    const fixture = TestBed.createComponent(TurnTimelineComponent);
    fixture.componentRef.setInput('steps', steps);
    fixture.componentRef.setInput('label', 'Orden de cobro');
    fixture.detectChanges();
    return fixture.nativeElement as HTMLElement;
  }

  it('es una lista ordenada con nombre accesible', () => {
    const list = render(STEPS).querySelector('ol');
    expect(list?.getAttribute('aria-label')).toBe('Orden de cobro');
    expect(list?.querySelectorAll('li').length).toBe(3);
  });

  it('marca solo el paso actual con aria-current="step" y lo anuncia en texto', () => {
    const items = render(STEPS).querySelectorAll('li');
    expect(items[0].getAttribute('aria-current')).toBeNull();
    expect(items[1].getAttribute('aria-current')).toBe('step');
    expect(items[1].querySelector('.state')?.textContent?.trim()).toBe('En curso');
    expect(items[0].querySelector('.visually-hidden')?.textContent?.trim()).toBe('Completado');
  });

  it('numera los pasos pendientes y resalta el del usuario', () => {
    const items = render(STEPS).querySelectorAll('li');
    expect(items[2].querySelector('.marker')?.textContent?.trim()).toBe('3');
    expect(items[2].querySelector('.tag')?.textContent?.trim()).toBe('Tú');
  });

  it('no falla con una lista vacía', () => {
    expect(render([]).querySelectorAll('li').length).toBe(0);
  });
});
