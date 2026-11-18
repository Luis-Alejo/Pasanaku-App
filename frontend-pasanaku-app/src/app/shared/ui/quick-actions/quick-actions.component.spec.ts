import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { add, wallet } from 'ionicons/icons';

import type { QuickAction } from './quick-actions.component';
import { QuickActionsComponent } from './quick-actions.component';

const ACTIONS: QuickAction[] = [
  { id: 'pay', label: 'Aportar', icon: wallet, accent: 'indigo', link: '/tabs/groups/x/contribute' },
  { id: 'invite', label: 'Invitar', icon: add, accent: 'teal', badge: 3 },
];

describe('QuickActionsComponent', () => {
  function render() {
    TestBed.configureTestingModule({ providers: [provideRouter([])] });
    const fixture = TestBed.createComponent(QuickActionsComponent);
    fixture.componentRef.setInput('actions', ACTIONS);
    fixture.detectChanges();
    return fixture;
  }

  it('usa enlaces para navegar y botones para acciones', () => {
    const el = render().nativeElement as HTMLElement;
    expect(el.querySelector('a.action')?.getAttribute('href')).toBe('/tabs/groups/x/contribute');
    expect(el.querySelector('button.action')?.textContent).toContain('Invitar');
  });

  it('avisa la acción elegida y anuncia el aviso numérico en texto', () => {
    const fixture = render();
    const spy = vi.fn();
    fixture.componentInstance.selected.subscribe(spy);
    const button = (fixture.nativeElement as HTMLElement).querySelector('button.action') as HTMLButtonElement;
    button.click();
    expect(spy).toHaveBeenCalledWith('invite');
    expect(button.querySelector('.visually-hidden')?.textContent?.trim()).toBe('(3 pendientes)');
  });
});
