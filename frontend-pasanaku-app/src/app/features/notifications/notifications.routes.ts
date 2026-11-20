import type { Routes } from '@angular/router';

export const notificationsRoutes: Routes = [
  {
    path: '',
    loadComponent: () => import('./pages/notifications/notifications.page').then((m) => m.NotificationsPage),
  },
];
