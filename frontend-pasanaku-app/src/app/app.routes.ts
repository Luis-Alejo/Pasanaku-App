import type { Routes } from '@angular/router';
import { authGuard } from '@core/auth/auth.guards';

import { devRoutes } from './dev/dev.routes';

export const routes: Routes = [
  ...devRoutes,
  {
    path: 'auth',
    loadChildren: () => import('@features/auth/auth.routes').then((m) => m.authRoutes),
  },
  {
    path: 'join',
    canActivate: [authGuard],
    loadChildren: () => import('@features/groups/join.routes').then((m) => m.joinRoutes),
  },
  {
    path: '',
    canActivate: [authGuard],
    loadChildren: () => import('@layout/tabs/tabs.routes').then((m) => m.tabsRoutes),
  },
];
