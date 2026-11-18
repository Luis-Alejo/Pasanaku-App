import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';

import { HomeStore } from '../../data-access/home.store';

import { HomePage } from './home.page';

describe('HomePage', () => {
  it('should create', () => {
    TestBed.configureTestingModule({ providers: [provideRouter([]), HomeStore] });
    const fixture = TestBed.createComponent(HomePage);
    fixture.detectChanges();
    expect(fixture.componentInstance).toBeTruthy();
  });
});
