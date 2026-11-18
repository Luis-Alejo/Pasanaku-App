import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import type { Group } from '@core/models/domain.models';

import { MOCK_GROUPS } from '../../data-access/groups.mock';

import { GroupCardComponent } from './group-card.component';

describe('GroupCardComponent', () => {
  function render(group: Group) {
    TestBed.configureTestingModule({ providers: [provideRouter([])] });
    const fixture = TestBed.createComponent(GroupCardComponent);
    fixture.componentRef.setInput('group', group);
    fixture.componentRef.setInput('userId', 'user-ana');
    fixture.detectChanges();
    return fixture.nativeElement as HTMLElement;
  }

  it('muestra nombre, estado, aporte y progreso', () => {
    const el = render(MOCK_GROUPS.find((g) => g.id === 'group-familia-quispe') as Group);
    expect(el.querySelector('.name')?.textContent?.trim()).toBe('Pasanaku familia Quispe');
    expect(el.querySelector('.status')?.textContent?.trim()).toBe('En curso');
    expect(el.querySelector('.value')?.textContent?.trim()).toBe('500,00 BOB');
    expect(el.querySelector('.meta')?.textContent?.trim()).toBe('6 de 6 miembros · Privado');
    expect(el.querySelector('.progress')?.textContent).toContain('Tu cobro');
  });
});
