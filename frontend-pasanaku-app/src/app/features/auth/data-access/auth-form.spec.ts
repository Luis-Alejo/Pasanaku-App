import { FormControl } from '@angular/forms';
import type { User } from '@core/models/domain.models';

import { ciValidator, phoneValidator, safeReturnUrl, urlAfterAuth } from './auth-form';

const user = (kycStatus: User['kycStatus']): User => ({
  id: 'u1',
  displayName: 'Rosa',
  phone: '+59171234567',
  email: null,
  walletAddress: 'G',
  kycStatus,
});

describe('formularios de acceso', () => {
  it.each(['71234567', '+591 71234567', '59171234567', '+5491155551234'])('acepta el celular %s', (phone) => {
    expect(phoneValidator(new FormControl(phone))).toBeNull();
  });

  it.each(['1234', '51234567', 'abcdefgh'])('rechaza el celular %s', (phone) => {
    expect(phoneValidator(new FormControl(phone))).toEqual({ phone: true });
  });

  it.each(['1234567', '1234567-1A', '12345'])('acepta el CI %s', (ci) => {
    expect(ciValidator(new FormControl(ci))).toBeNull();
  });

  it.each(['1234', 'ABC123', '1234567-ABC'])('rechaza el CI %s', (ci) => {
    expect(ciValidator(new FormControl(ci))).toEqual({ ci: true });
  });

  it('solo vuelve a rutas internas', () => {
    expect(safeReturnUrl('/tabs/groups/1')).toBe('/tabs/groups/1');
    expect(safeReturnUrl('https://otro.sitio')).toBe('/tabs/home');
    expect(safeReturnUrl('//otro.sitio')).toBe('/tabs/home');
    expect(safeReturnUrl('/auth/login')).toBe('/tabs/home');
    expect(safeReturnUrl(undefined)).toBe('/tabs/home');
  });

  it('pasa por la verificación si falta', () => {
    expect(urlAfterAuth(user('VERIFIED'), '/join/abc')).toBe('/join/abc');
    expect(urlAfterAuth(user('PENDING'), '/join/abc')).toBe('/auth/verify?returnUrl=%2Fjoin%2Fabc');
  });
});
