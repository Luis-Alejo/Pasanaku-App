import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { wallet } from 'ionicons/icons';

import { ActionRowComponent } from './action-row.component';

describe('ActionRowComponent', () => {
  function render(link?: string) {
    TestBed.configureTestingModule({ providers: [provideRouter([])] });
    const fixture = TestBed.createComponent(ActionRowComponent);
    fixture.componentRef.setInput('icon', wallet);
    fixture.componentRef.setInput('title', 'Elige tu turno');
    fixture.componentRef.setInput('subtitle', 'Ahorro del equipo de fútbol');
    if (link) {
      fixture.componentRef.setInput('link', link);
    }
    fixture.detectChanges();
    return fixture.nativeElement as HTMLElement;
  }

  it('con enlace, toda la fila es el enlace y lleva flecha', () => {
    const el = render('/tabs/groups/x/turns');
    const a = el.querySelector('a.row');
    expect(a?.getAttribute('href')).toBe('/tabs/groups/x/turns');
    expect(a?.textContent).toContain('Elige tu turno');
    expect(el.querySelector('.chevron')).not.toBeNull();
  });

  it('sin enlace es solo informativa', () => {
    const el = render();
    expect(el.querySelector('a')).toBeNull();
    expect(el.querySelector('.subtitle')?.textContent).toBe('Ahorro del equipo de fútbol');
  });
});
