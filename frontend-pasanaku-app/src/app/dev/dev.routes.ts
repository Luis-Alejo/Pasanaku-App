import type { Routes } from '@angular/router';

/**
 * Rutas solo de desarrollo. En producción angular.json reemplaza este archivo
 * por dev.routes.prod.ts (vacío), así que ni la ruta ni su código llegan al build.
 */
export const devRoutes: Routes = [
  {
    path: 'dev/ui-lab',
    loadComponent: () => import('./ui-lab/ui-lab.page').then((m) => m.UiLabPage),
  },
];
