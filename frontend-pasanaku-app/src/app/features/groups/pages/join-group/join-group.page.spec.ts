import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';

import { GroupsStore } from '../../data-access/groups.store';

import { JoinGroupPage } from './join-group.page';

describe('JoinGroupPage', () => {
  it('should create', () => {
    TestBed.configureTestingModule({ providers: [provideRouter([]), GroupsStore] });
    const fixture = TestBed.createComponent(JoinGroupPage);
    fixture.componentRef.setInput('code', 'FAMILIA26');
    fixture.detectChanges();
    expect(fixture.componentInstance).toBeTruthy();
  });
});
