import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';

import { GroupsStore } from '../../data-access/groups.store';

import { CreateGroupPage } from './create-group.page';

describe('CreateGroupPage', () => {
  it('should create', () => {
    TestBed.configureTestingModule({ providers: [provideRouter([]), GroupsStore] });
    const fixture = TestBed.createComponent(CreateGroupPage);
    fixture.detectChanges();
    expect(fixture.componentInstance).toBeTruthy();
  });
});
