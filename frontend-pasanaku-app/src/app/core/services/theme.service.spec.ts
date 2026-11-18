import { TestBed } from '@angular/core/testing';

import { THEME_STORAGE_KEY, ThemeService } from './theme.service';

describe('ThemeService', () => {
  const html = document.documentElement;

  beforeEach(() => {
    localStorage.clear();
    html.classList.remove('ion-palette-dark');
    html.style.removeProperty('--pk-statusbar-surface');
    html.style.removeProperty('--pk-statusbar-brand');
  });

  function create(): ThemeService {
    TestBed.resetTestingModule();
    const service = TestBed.inject(ThemeService);
    service.init();
    return service;
  }

  it('cambia entre claro y oscuro con la clase de Ionic', () => {
    localStorage.setItem(THEME_STORAGE_KEY, 'light');
    const theme = create();
    expect(html.classList.contains('ion-palette-dark')).toBe(false);
    theme.toggle();
    expect(theme.mode()).toBe('dark');
    expect(html.classList.contains('ion-palette-dark')).toBe(true);
    theme.toggle();
    expect(html.classList.contains('ion-palette-dark')).toBe(false);
  });

  it('guarda la elección y la respeta al volver a abrir la app', () => {
    create().setMode('dark');
    expect(localStorage.getItem(THEME_STORAGE_KEY)).toBe('dark');
    html.classList.remove('ion-palette-dark');
    const reopened = create();
    expect(reopened.isDark()).toBe(true);
    expect(html.classList.contains('ion-palette-dark')).toBe(true);
  });

  it('pone en theme-color el color de la superficie o del encabezado índigo', () => {
    html.style.setProperty('--pk-statusbar-surface', '#ffffff');
    html.style.setProperty('--pk-statusbar-brand', '#281c9d');
    const theme = create();
    const meta = () => document.querySelector<HTMLMetaElement>('meta[name="theme-color"]')?.content;
    expect(meta()).toBe('#ffffff');
    theme.setHeaderTone('brand');
    expect(meta()).toBe('#281c9d');
  });
});
