import { Injectable, computed, inject, signal } from '@angular/core';
import { ApiError } from '@core/graphql/api-error';
import type { User } from '@core/models/domain.models';
import { TokenStorage } from '@core/storage/token.storage';
import { environment } from '@env/environment';

import type { AuthSession, LoginData, RegisterData } from './auth.api';
import { AuthApi } from './auth.api';
import { MOCK_CURRENT_USER } from './current-user.mock';

/** Al abrir la app no se espera más que esto a que responda el servidor. */
const RESTORE_TIMEOUT_MS = 8000;

/** Sesión del usuario. Con `useMocks` la app arranca con el usuario de prueba. */
@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly api = inject(AuthApi);
  private readonly tokens = inject(TokenStorage);
  private readonly user = signal<User | null>(environment.useMocks ? MOCK_CURRENT_USER : null);

  /** Usuario con sesión iniciada (null si no hay sesión). */
  readonly currentUser = this.user.asReadonly();
  readonly isAuthenticated = computed(() => this.user() !== null);

  /** Al abrir la app, recupera la sesión guardada. Nunca impide arrancar. */
  async restore(): Promise<void> {
    if (environment.useMocks || !this.tokens.get()) {
      return;
    }
    let timer: ReturnType<typeof setTimeout> | undefined;
    const timeout = new Promise<never>((_, reject) => {
      timer = setTimeout(() => reject(new ApiError('network', 'Tiempo de espera agotado')), RESTORE_TIMEOUT_MS);
    });
    try {
      this.user.set(await Promise.race([this.api.me(), timeout]));
    } catch (error) {
      // Sin conexión el token sigue siendo válido: solo se borra si el servidor lo rechaza.
      if (error instanceof ApiError && error.kind === 'unauthenticated') {
        this.clearSession();
      }
    } finally {
      clearTimeout(timer);
    }
  }

  /** Vuelve a pedir los datos del usuario (por ejemplo, la reputación). Sin conexión, deja los que hay. */
  async refreshUser(): Promise<void> {
    if (!this.user()) return;
    try {
      this.user.set(await this.api.me());
    } catch {
      // Se mantienen los datos actuales.
    }
  }

  async login(data: LoginData): Promise<User> {
    return this.startSession(await this.api.login(data));
  }

  async register(data: RegisterData): Promise<User> {
    return this.startSession(await this.api.register(data));
  }

  async submitKyc(ciNumber: string): Promise<User> {
    const user = await this.api.submitKyc(ciNumber);
    this.user.set(user);
    return user;
  }

  /** Cierra la sesión en este dispositivo y olvida sus datos. */
  clearSession(): void {
    this.tokens.clear();
    this.user.set(null);
    void this.api.clearCache().catch(() => undefined);
  }

  private startSession({ token, user }: AuthSession): User {
    this.tokens.set(token);
    this.user.set(user);
    return user;
  }
}
