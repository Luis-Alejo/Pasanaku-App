import { Injectable, inject } from '@angular/core';
import { ApiError, UNKNOWN_ERROR_MESSAGE, toApiError } from '@core/graphql/api-error';
import type { User } from '@core/models/domain.models';
import { environment } from '@env/environment';
import type { SessionUserFragment } from '@gql';
import { LoginGQL, MeGQL, RegisterGQL, SubmitKycGQL } from '@gql';
import { Apollo } from 'apollo-angular';
import type { Observable } from 'rxjs';
import { firstValueFrom } from 'rxjs';

import { MOCK_CURRENT_USER } from './current-user.mock';

export interface LoginData {
  phone: string;
  password: string;
}

export interface RegisterData extends LoginData {
  fullName: string;
  email?: string;
}

export interface AuthSession {
  token: string;
  user: User;
}

/** De dónde sale la sesión. `AuthService` solo conoce esta interfaz. */
@Injectable({ providedIn: 'root', useFactory: createAuthApi })
export abstract class AuthApi {
  abstract login(data: LoginData): Promise<AuthSession>;
  abstract register(data: RegisterData): Promise<AuthSession>;
  abstract me(): Promise<User>;
  abstract submitKyc(ciNumber: string): Promise<User>;
  /** Olvida los datos del usuario anterior. */
  abstract clearCache(): Promise<void>;
}

function createAuthApi(): AuthApi {
  return environment.useMocks ? new MockAuthApi() : inject(GraphqlAuthApi);
}

function toUser(user: SessionUserFragment): User {
  return {
    id: user.id,
    displayName: user.fullName,
    phone: user.phone,
    email: user.email ?? null,
    walletAddress: user.stellarPublicKey,
    kycStatus: user.kycStatus,
  };
}

/** Espera la respuesta, traduce el error y exige que haya datos. */
async function result<T>(request: Observable<{ data?: T | null }>): Promise<T> {
  let data: T | null | undefined;
  try {
    ({ data } = await firstValueFrom(request));
  } catch (error) {
    throw toApiError(error);
  }
  if (!data) {
    throw new ApiError('unknown', UNKNOWN_ERROR_MESSAGE);
  }
  return data;
}

@Injectable({ providedIn: 'root' })
export class GraphqlAuthApi extends AuthApi {
  private readonly apollo = inject(Apollo);
  private readonly loginGql = inject(LoginGQL);
  private readonly registerGql = inject(RegisterGQL);
  private readonly meGql = inject(MeGQL);
  private readonly submitKycGql = inject(SubmitKycGQL);

  override async login(input: LoginData): Promise<AuthSession> {
    try {
      const { login } = await result(this.loginGql.mutate({ variables: { input } }));
      return { token: login.accessToken, user: toUser(login.user) };
    } catch (error) {
      // El backend no distingue, a propósito, si falló el celular o la contraseña.
      if (error instanceof ApiError && error.kind === 'unauthenticated') {
        throw new ApiError('unauthenticated', 'Celular o contraseña incorrectos.');
      }
      throw error;
    }
  }

  override async register(input: RegisterData): Promise<AuthSession> {
    const { register } = await result(this.registerGql.mutate({ variables: { input } }));
    return { token: register.accessToken, user: toUser(register.user) };
  }

  override async me(): Promise<User> {
    const { me } = await result(this.meGql.fetch({ fetchPolicy: 'no-cache' }));
    return toUser(me);
  }

  override async submitKyc(ciNumber: string): Promise<User> {
    const { submitKyc } = await result(this.submitKycGql.mutate({ variables: { input: { ciNumber } } }));
    return toUser(submitKyc);
  }

  override async clearCache(): Promise<void> {
    await this.apollo.client.clearStore();
  }
}

const MOCK_DELAY_MS = 300;

/** Con datos de prueba acepta cualquier celular y contraseña válidos. */
export class MockAuthApi extends AuthApi {
  private user: User = MOCK_CURRENT_USER;

  private respond<T>(value: T): Promise<T> {
    return new Promise((resolve) => setTimeout(() => resolve(structuredClone(value)), MOCK_DELAY_MS));
  }

  override login(): Promise<AuthSession> {
    this.user = MOCK_CURRENT_USER;
    return this.respond({ token: 'mock-token', user: this.user });
  }

  override register(data: RegisterData): Promise<AuthSession> {
    this.user = {
      ...MOCK_CURRENT_USER,
      displayName: data.fullName,
      phone: data.phone,
      email: data.email ?? null,
      kycStatus: 'PENDING',
    };
    return this.respond({ token: 'mock-token', user: this.user });
  }

  override me(): Promise<User> {
    return this.respond(this.user);
  }

  override submitKyc(): Promise<User> {
    this.user = { ...this.user, kycStatus: 'VERIFIED' };
    return this.respond(this.user);
  }

  override clearCache(): Promise<void> {
    return Promise.resolve();
  }
}
