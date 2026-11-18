import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';

import { GroupsStore } from '../../data-access/groups.store';

import { GroupDetailPage } from './group-detail.page';

describe('GroupDetailPage', () => {
  it('should create', () => {
    TestBed.configureTestingModule({ providers: [provideRouter([]), GroupsStore] });
    const fixture = TestBed.createComponent(GroupDetailPage);
    fixture.componentRef.setInput('id', 'group-familia-quispe');
    fixture.detectChanges();
    expect(fixture.componentInstance).toBeTruthy();
  });
});
