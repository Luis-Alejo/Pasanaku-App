import type { Routes } from '@angular/router';

import { HomeStore } from './data-access/home.store';

export const homeRoutes: Routes = [
  {
    path: '',
    providers: [HomeStore],
    loadComponent: () => import('./pages/home/home.page').then((m) => m.HomePage),
  },
];
