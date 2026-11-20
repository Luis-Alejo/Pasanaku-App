import { TestBed } from '@angular/core/testing';
import { ApiError } from '@core/graphql/api-error';
import type { User } from '@core/models/domain.models';
import { TokenStorage } from '@core/storage/token.storage';
import { environment } from '@env/environment';

import { AuthApi } from './auth.api';
import { AuthService } from './auth.service';

const USER: User = {
  id: 'u1',
  displayName: 'Rosa Mamani',
  phone: '+59171234567',
  email: null,
  walletAddress: 'GROSA',
  kycStatus: 'PENDING',
};

describe('AuthService (API real)', () => {
  const api = {
    login: vi.fn(),
    register: vi.fn(),
    me: vi.fn(),
    submitKyc: vi.fn(),
    clearCache: vi.fn(() => Promise.resolve()),
  };
  const useMocks = environment.useMocks;
  let tokens: TokenStorage;

  const service = () => TestBed.inject(AuthService);

  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
    environment.useMocks = false;
    TestBed.configureTestingModule({ providers: [{ provide: AuthApi, useValue: api }] });
    tokens = TestBed.inject(TokenStorage);
  });

  afterEach(() => {
    environment.useMocks = useMocks;
  });

  it('guarda el token y el usuario al entrar', async () => {
    api.login.mockResolvedValue({ token: 'jwt', user: USER });
    await service().login({ phone: '71234567', password: 'secreta123' });
    expect(tokens.get()).toBe('jwt');
    expect(service().currentUser()).toEqual(USER);
  });

  it('no consulta al servidor si no hay sesión guardada', async () => {
    await service().restore();
    expect(api.me).not.toHaveBeenCalled();
    expect(service().isAuthenticated()).toBe(false);
  });

  it('recupera la sesión guardada', async () => {
    tokens.set('jwt');
    api.me.mockResolvedValue(USER);
    await service().restore();
    expect(service().currentUser()).toEqual(USER);
  });

  it('borra el token si el servidor lo rechaza', async () => {
    tokens.set('vencido');
    api.me.mockRejectedValue(new ApiError('unauthenticated', 'No'));
    await service().restore();
    expect(tokens.get()).toBeNull();
    expect(api.clearCache).toHaveBeenCalled();
  });

  it('conserva el token si no hay conexión', async () => {
    tokens.set('jwt');
    api.me.mockRejectedValue(new ApiError('network', 'Sin red'));
    await service().restore();
    expect(tokens.get()).toBe('jwt');
    expect(service().isAuthenticated()).toBe(false);
  });

  it('actualiza al usuario tras verificar su identidad', async () => {
    api.submitKyc.mockResolvedValue({ ...USER, kycStatus: 'VERIFIED' });
    await service().submitKyc('1234567');
    expect(service().currentUser()?.kycStatus).toBe('VERIFIED');
  });

  it('cierra la sesión', async () => {
    api.login.mockResolvedValue({ token: 'jwt', user: USER });
    await service().login({ phone: '71234567', password: 'secreta123' });
    service().clearSession();
    expect(tokens.get()).toBeNull();
    expect(service().currentUser()).toBeNull();
  });
});
