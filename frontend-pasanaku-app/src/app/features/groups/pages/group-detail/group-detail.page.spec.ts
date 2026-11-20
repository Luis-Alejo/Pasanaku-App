import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';

import { GroupsStore } from '../../data-access/groups.store';

import { GroupDetailPage } from './group-detail.page';

describe('GroupDetailPage', () => {
  it('should create', () => {
    TestBed.configureTestingModule({ providers: [provideRouter([]), GroupsStore] });
    const fixture = TestBed.createComponent(GroupDetailPage);
    fixture.componentRef.setInput('id', 'group-familia');
    fixture.detectChanges();
    expect(fixture.componentInstance).toBeTruthy();
  });

  it('carga el grupo una sola vez aunque el store cambie después (sin bucle de recargas)', async () => {
    TestBed.configureTestingModule({ providers: [provideRouter([]), GroupsStore] });
    const fixture = TestBed.createComponent(GroupDetailPage);
    const store = fixture.debugElement.injector.get(GroupsStore);
    const load = vi.spyOn(store, 'loadGroup');
    fixture.componentRef.setInput('id', 'group-familia');
    fixture.detectChanges();
    // Esperar a que llegue el grupo (mock: 300 ms) y a que corran los effects.
    await new Promise((resolve) => setTimeout(resolve, 900));
    fixture.detectChanges();
    await fixture.whenStable();
    expect(store.group()?.id).toBe('group-familia');
    expect(load).toHaveBeenCalledTimes(1);
  });
});
