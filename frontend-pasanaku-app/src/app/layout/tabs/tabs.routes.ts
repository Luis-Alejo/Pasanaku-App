import type { Routes } from '@angular/router';

import { TabsPage } from './tabs.page';

export const tabsRoutes: Routes = [
  {
    path: 'tabs',
    component: TabsPage,
    children: [
      {
        path: 'home',
        loadChildren: () => import('@features/home/home.routes').then((m) => m.homeRoutes),
      },
      {
        path: 'groups',
        loadChildren: () => import('@features/groups/groups.routes').then((m) => m.groupsRoutes),
      },
      {
        path: 'profile',
        loadChildren: () => import('@features/profile/profile.routes').then((m) => m.profileRoutes),
      },
      {
        path: '',
        redirectTo: '/tabs/home',
        pathMatch: 'full',
      },
    ],
  },
  {
    path: '',
    redirectTo: '/tabs/home',
    pathMatch: 'full',
  },
];
