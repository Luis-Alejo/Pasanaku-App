import type { Routes } from '@angular/router';
import { guestGuard, unverifiedGuard } from '@core/auth/auth.guards';

export const authRoutes: Routes = [
  {
    path: 'login',
    canActivate: [guestGuard],
    loadComponent: () => import('./pages/login/login.page').then((m) => m.LoginPage),
  },
  {
    path: 'register',
    canActivate: [guestGuard],
    loadComponent: () => import('./pages/register/register.page').then((m) => m.RegisterPage),
  },
  {
    path: 'verify',
    canActivate: [unverifiedGuard],
    loadComponent: () => import('./pages/verify-identity/verify-identity.page').then((m) => m.VerifyIdentityPage),
  },
  { path: '', redirectTo: 'login', pathMatch: 'full' },
];
