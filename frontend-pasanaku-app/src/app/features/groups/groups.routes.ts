import type { Routes } from '@angular/router';

export const groupsRoutes: Routes = [
  {
    path: '',
    loadComponent: () => import('./pages/group-list/group-list.page').then((m) => m.GroupListPage),
  },
];
