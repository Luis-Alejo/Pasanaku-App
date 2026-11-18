import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';

import { GroupsStore } from '../../data-access/groups.store';

import { GroupListPage } from './group-list.page';

describe('GroupListPage', () => {
  it('should create', () => {
    TestBed.configureTestingModule({ providers: [provideRouter([]), GroupsStore] });
    const fixture = TestBed.createComponent(GroupListPage);
    fixture.detectChanges();
    expect(fixture.componentInstance).toBeTruthy();
  });
});
