import type { Routes } from '@angular/router';

import { devRoutes } from './dev/dev.routes';

export const routes: Routes = [
  ...devRoutes,
  {
    path: '',
    loadChildren: () => import('@layout/tabs/tabs.routes').then((m) => m.tabsRoutes),
  },
];
