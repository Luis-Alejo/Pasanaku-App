import { isDevMode } from '@angular/core';
import { bootstrapApplication } from '@angular/platform-browser';
import { Capacitor } from '@capacitor/core';
import { appProviders } from '@core/providers';

import { AppComponent } from './app/app.component';

bootstrapApplication(AppComponent, { providers: appProviders });

// Instalable desde el navegador (PWA). En la app nativa y en desarrollo no hace falta.
if (!isDevMode() && !Capacitor.isNativePlatform() && 'serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').catch(() => undefined);
  });
}
