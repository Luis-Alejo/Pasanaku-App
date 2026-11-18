import type { Routes } from '@angular/router';

import { GroupsStore } from './data-access/groups.store';

export const groupsRoutes: Routes = [
  {
    path: '',
    providers: [GroupsStore],
    children: [
      {
        path: '',
        loadComponent: () => import('./pages/group-list/group-list.page').then((m) => m.GroupListPage),
      },
      {
        path: ':id',
        loadComponent: () => import('./pages/group-detail/group-detail.page').then((m) => m.GroupDetailPage),
      },
    ],
  },
];
