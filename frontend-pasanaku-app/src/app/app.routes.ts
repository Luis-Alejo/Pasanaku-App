import type { Routes } from '@angular/router';

import { devRoutes } from './dev/dev.routes';

export const routes: Routes = [
  ...devRoutes,
  {
    path: 'join',
    loadChildren: () => import('@features/groups/join.routes').then((m) => m.joinRoutes),
  },
  {
    path: '',
    loadChildren: () => import('@layout/tabs/tabs.routes').then((m) => m.tabsRoutes),
  },
];
