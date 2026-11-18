import { TestBed } from '@angular/core/testing';

import { AvatarComponent } from './avatar.component';

describe('AvatarComponent', () => {
  it('muestra iniciales, es decorativo y aplica tamaño', () => {
    const fixture = TestBed.createComponent(AvatarComponent);
    fixture.componentRef.setInput('name', 'Ana Quispe Mamani');
    fixture.componentRef.setInput('size', 'lg');
    fixture.detectChanges();
    const el = fixture.nativeElement as HTMLElement;
    expect(el.textContent?.trim()).toBe('AM');
    expect(el.getAttribute('aria-hidden')).toBe('true');
    expect(el.classList.contains('avatar--lg')).toBe(true);
  });
});
