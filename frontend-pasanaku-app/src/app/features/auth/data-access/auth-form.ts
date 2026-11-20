import type { ValidatorFn } from '@angular/forms';
import type { User } from '@core/models/domain.models';

/** Límites del backend (RegisterInput y SubmitKycInput). */
export const AUTH_LIMITS = { nameMin: 2, nameMax: 160, passwordMin: 8, passwordMax: 72, emailMax: 254 };

const INTERNATIONAL_PHONE = /^\+[1-9]\d{7,14}$/;
const BOLIVIAN_PHONE = /^(?:591)?[67]\d{7}$/;
const CI_NUMBER = /^\d{5,10}([-\s]?[0-9A-Za-z]{1,2})?$/;

/** Celular boliviano de 8 dígitos o número internacional con +. */
export const phoneValidator: ValidatorFn = (control) => {
  const phone = String(control.value ?? '').replace(/[\s\-().]/g, '');
  return !phone || INTERNATIONAL_PHONE.test(phone) || BOLIVIAN_PHONE.test(phone) ? null : { phone: true };
};

/** CI boliviano, con complemento opcional (1234567 o 1234567-1A). */
export const ciValidator: ValidatorFn = (control) => {
  const ci = String(control.value ?? '').trim();
  return !ci || CI_NUMBER.test(ci) ? null : { ci: true };
};

/** Solo rutas internas: evita que un enlace lleve a otro sitio después de entrar. */
export function safeReturnUrl(url: string | undefined): string {
  return url?.startsWith('/') && !url.startsWith('//') && !url.startsWith('/auth') ? url : '/tabs/home';
}

/** A dónde ir al entrar: primero verificar la identidad, si falta. */
export function urlAfterAuth(user: User, returnUrl: string | undefined): string {
  const target = safeReturnUrl(returnUrl);
  return user.kycStatus === 'VERIFIED' ? target : `/auth/verify?returnUrl=${encodeURIComponent(target)}`;
}
