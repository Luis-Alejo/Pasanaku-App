import type { Routes } from '@angular/router';

import { GroupsStore } from './data-access/groups.store';

/** /join/:code — enlace de invitación a un grupo privado (fuera de las pestañas). */
export const joinRoutes: Routes = [
  {
    path: ':code',
    providers: [GroupsStore],
    loadComponent: () => import('./pages/join-group/join-group.page').then((m) => m.JoinGroupPage),
  },
];
