import { Injectable, inject } from '@angular/core';
import { Router } from '@angular/router';
import { App } from '@capacitor/app';
import { Capacitor } from '@capacitor/core';
import { Platform } from '@ionic/angular';

/** Raíces de la navegación: desde aquí, "atrás" cierra la app (Material Design 3). */
const ROOT_PATHS = ['/tabs/home', '/tabs/groups', '/tabs/wallet', '/tabs/profile', '/auth/login'];

/**
 * Botón "atrás" de Android, predecible:
 * 1. Ionic cierra primero los modales, alertas y menús (prioridades altas).
 * 2. El router-outlet vuelve a la pantalla anterior si puede (prioridad 0).
 * 3. Si nadie lo manejó (prioridad -1): en la raíz de una pestaña sale de la
 *    app; en otra pantalla sin historial (ej. un enlace /join/CODIGO) va a Inicio.
 */
@Injectable({ providedIn: 'root' })
export class BackButtonService {
  private readonly platform = inject(Platform);
  private readonly router = inject(Router);

  init(): void {
    if (!Capacitor.isNativePlatform()) return;
    this.platform.backButton.subscribeWithPriority(-1, () => {
      const path = this.router.url.split(/[?#]/)[0];
      if (ROOT_PATHS.includes(path)) {
        void App.exitApp();
      } else {
        void this.router.navigateByUrl('/tabs/home', { replaceUrl: true });
      }
    });
  }
}
