import type { Routes } from '@angular/router';

export const profileRoutes: Routes = [
  {
    path: '',
    loadComponent: () => import('./pages/profile/profile.page').then((m) => m.ProfilePage),
  },
];
