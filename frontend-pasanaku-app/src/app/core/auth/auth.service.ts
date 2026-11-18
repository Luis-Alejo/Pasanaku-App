import { Injectable, signal } from '@angular/core';
import type { User } from '@core/models/domain.models';

import { MOCK_CURRENT_USER } from './current-user.mock';

/**
 * Sesión del usuario. Por ahora siempre devuelve el usuario de prueba;
 * el login real llega en el paso 10.
 */
@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly user = signal<User | null>(MOCK_CURRENT_USER);

  /** Usuario con sesión iniciada (null si no hay sesión). */
  readonly currentUser = this.user.asReadonly();
}
