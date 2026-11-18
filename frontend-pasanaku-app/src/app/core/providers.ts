import type { EnvironmentProviders, Provider } from '@angular/core';
import { inject, provideAppInitializer } from '@angular/core';
import {
  PreloadAllModules,
  RouteReuseStrategy,
  provideRouter,
  withComponentInputBinding,
  withPreloading,
} from '@angular/router';
import { IonicRouteStrategy, provideIonicAngular } from '@ionic/angular';

import { routes } from '../app.routes';

import { BackButtonService } from './services/back-button.service';
import { ThemeService } from './services/theme.service';

/** Todos los providers globales de la app. main.ts solo usa esta lista. */
export const appProviders: (Provider | EnvironmentProviders)[] = [
  { provide: RouteReuseStrategy, useClass: IonicRouteStrategy },
  provideIonicAngular(),
  provideRouter(routes, withPreloading(PreloadAllModules), withComponentInputBinding()),
  // Tema claro/oscuro guardado por la persona (no el del dispositivo).
  provideAppInitializer(() => inject(ThemeService).init()),
  provideAppInitializer(() => inject(BackButtonService).init()),
];
