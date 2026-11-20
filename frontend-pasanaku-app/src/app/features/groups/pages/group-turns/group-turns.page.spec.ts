import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';

import { GroupsStore } from '../../data-access/groups.store';

import { GroupTurnsPage } from './group-turns.page';

describe('GroupTurnsPage', () => {
  it('should create', () => {
    TestBed.configureTestingModule({ providers: [provideRouter([]), GroupsStore] });
    const fixture = TestBed.createComponent(GroupTurnsPage);
    fixture.componentRef.setInput('id', 'group-familia');
    fixture.detectChanges();
    expect(fixture.componentInstance).toBeTruthy();
  });
});
