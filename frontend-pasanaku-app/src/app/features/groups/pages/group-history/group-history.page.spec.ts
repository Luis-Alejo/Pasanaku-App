import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';

import { GroupsStore } from '../../data-access/groups.store';

import { GroupHistoryPage } from './group-history.page';

describe('GroupHistoryPage', () => {
  it('should create', () => {
    TestBed.configureTestingModule({ providers: [provideRouter([]), GroupsStore] });
    const fixture = TestBed.createComponent(GroupHistoryPage);
    fixture.componentRef.setInput('id', 'group-familia-quispe');
    fixture.detectChanges();
    expect(fixture.componentInstance).toBeTruthy();
  });
});
