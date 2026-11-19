import { inject } from '@angular/core';
import type { CanActivateFn } from '@angular/router';
import { Router } from '@angular/router';

import { AuthService } from './auth.service';

/** Pide sesión; al entrar se vuelve a la pantalla que se quería abrir. */
export const authGuard: CanActivateFn = (_route, state) => {
  if (inject(AuthService).isAuthenticated()) {
    return true;
  }
  const queryParams = state.url === '/' || state.url === '/tabs/home' ? {} : { returnUrl: state.url };
  return inject(Router).createUrlTree(['/auth/login'], { queryParams });
};

/** Login y registro: quien ya tiene sesión va a Inicio. */
export const guestGuard: CanActivateFn = () =>
  !inject(AuthService).isAuthenticated() || inject(Router).createUrlTree(['/tabs/home']);

/** Verificar identidad: solo con sesión y si todavía falta verificarla. */
export const unverifiedGuard: CanActivateFn = () => {
  const user = inject(AuthService).currentUser();
  const router = inject(Router);
  if (!user) {
    return router.createUrlTree(['/auth/login']);
  }
  return user.kycStatus !== 'VERIFIED' || router.createUrlTree(['/tabs/home']);
};
