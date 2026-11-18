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
        // Antes de ':id' para que "new" no se tome como un id.
        path: 'new',
        loadComponent: () => import('./pages/create-group/create-group.page').then((m) => m.CreateGroupPage),
      },
      {
        path: ':id',
        loadComponent: () => import('./pages/group-detail/group-detail.page').then((m) => m.GroupDetailPage),
      },
      {
        path: ':id/turns',
        loadComponent: () => import('./pages/group-turns/group-turns.page').then((m) => m.GroupTurnsPage),
      },
      {
        path: ':id/contribute',
        loadComponent: () =>
          import('./pages/group-contribute/group-contribute.page').then((m) => m.GroupContributePage),
      },
      {
        path: ':id/history',
        loadComponent: () => import('./pages/group-history/group-history.page').then((m) => m.GroupHistoryPage),
      },
      {
        path: ':id/join',
        loadComponent: () => import('./pages/join-group/join-group.page').then((m) => m.JoinGroupPage),
      },
    ],
  },
];
