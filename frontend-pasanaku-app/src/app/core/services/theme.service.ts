import { DOCUMENT } from '@angular/common';
import { Injectable, computed, inject, signal } from '@angular/core';
import { Capacitor } from '@capacitor/core';
import { StatusBar, Style } from '@capacitor/status-bar';

export type ThemeMode = 'light' | 'dark';

/** Tono de la parte de arriba de la pantalla: superficie normal o encabezado índigo. */
export type HeaderTone = 'surface' | 'brand';

/** Clave en localStorage. La misma la lee el script de index.html para evitar el destello. */
export const THEME_STORAGE_KEY = 'pk-theme';
const DARK_CLASS = 'ion-palette-dark';

/**
 * Tema claro/oscuro elegido por la persona dentro de la app (no sigue al
 * dispositivo). La primera vez toma el tema del sistema como valor inicial;
 * después guarda la elección y la respeta al volver a abrir la app.
 */
@Injectable({ providedIn: 'root' })
export class ThemeService {
  private readonly document = inject(DOCUMENT);

  private readonly _mode = signal<ThemeMode>(this.readInitial());
  private readonly _headerTone = signal<HeaderTone>('surface');

  readonly mode = this._mode.asReadonly();
  readonly isDark = computed(() => this._mode() === 'dark');

  /** Aplica el tema guardado. Se llama una vez al arrancar (core/providers.ts). */
  init(): void {
    this.apply();
  }

  toggle(): void {
    this.setMode(this.isDark() ? 'light' : 'dark');
  }

  setMode(mode: ThemeMode): void {
    this._mode.set(mode);
    try {
      localStorage.setItem(THEME_STORAGE_KEY, mode);
    } catch {
      // Sin almacenamiento (modo privado): el tema dura hasta cerrar la app.
    }
    this.apply();
  }

  /**
   * Las pantallas con encabezado índigo piden 'brand' al entrar y 'surface' al
   * salir, para que la barra de estado del sistema combine con la parte de arriba.
   */
  setHeaderTone(tone: HeaderTone): void {
    this._headerTone.set(tone);
    this.applySystemBars();
  }

  private readInitial(): ThemeMode {
    try {
      const saved = localStorage.getItem(THEME_STORAGE_KEY);
      if (saved === 'light' || saved === 'dark') {
        return saved;
      }
    } catch {
      // ignorar
    }
    return this.document.defaultView?.matchMedia?.('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  }

  private apply(): void {
    this.document.documentElement.classList.toggle(DARK_CLASS, this.isDark());
    this.applySystemBars();
  }

  /** theme-color (navegador/PWA) y barra de estado nativa (Android/iOS). */
  private applySystemBars(): void {
    const token = this._headerTone() === 'brand' ? '--pk-statusbar-brand' : '--pk-statusbar-surface';
    const color = getComputedStyle(this.document.documentElement).getPropertyValue(token).trim();
    if (!color) {
      return;
    }
    let meta = this.document.querySelector<HTMLMetaElement>('meta[name="theme-color"]');
    if (!meta) {
      meta = this.document.createElement('meta');
      meta.name = 'theme-color';
      this.document.head.appendChild(meta);
    }
    meta.content = color;

    if (Capacitor.isNativePlatform()) {
      // Style.Dark = íconos claros (para fondos oscuros o índigo).
      const lightIcons = this.isDark() || this._headerTone() === 'brand';
      void StatusBar.setStyle({ style: lightIcons ? Style.Dark : Style.Light }).catch(() => undefined);
      if (Capacitor.getPlatform() === 'android') {
        void StatusBar.setBackgroundColor({ color }).catch(() => undefined);
      }
    }
  }
}
