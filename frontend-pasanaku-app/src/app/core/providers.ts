import type { EnvironmentProviders, Provider } from '@angular/core';
import {
  PreloadAllModules,
  RouteReuseStrategy,
  provideRouter,
  withComponentInputBinding,
  withPreloading,
} from '@angular/router';
import { IonicRouteStrategy, provideIonicAngular } from '@ionic/angular';

import { routes } from '../app.routes';

/** Todos los providers globales de la app. main.ts solo usa esta lista. */
export const appProviders: (Provider | EnvironmentProviders)[] = [
  { provide: RouteReuseStrategy, useClass: IonicRouteStrategy },
  provideIonicAngular(),
  provideRouter(routes, withPreloading(PreloadAllModules), withComponentInputBinding()),
];
