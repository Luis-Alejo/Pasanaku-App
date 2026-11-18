import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';

import { GroupsStore } from '../../data-access/groups.store';

import { GroupContributePage } from './group-contribute.page';

describe('GroupContributePage', () => {
  it('should create', () => {
    TestBed.configureTestingModule({ providers: [provideRouter([]), GroupsStore] });
    const fixture = TestBed.createComponent(GroupContributePage);
    fixture.componentRef.setInput('id', 'group-oficina');
    fixture.detectChanges();
    expect(fixture.componentInstance).toBeTruthy();
  });
});
