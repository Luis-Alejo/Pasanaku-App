import type { AbstractControl, ValidationErrors, ValidatorFn } from '@angular/forms';

/**
 * Reglas del formulario "Crear grupo".
 * Máximo de miembros (20) confirmado. El resto es PROVISIONAL: confirmar con backend/contrato.
 */
export const GROUP_LIMITS = {
  nameMin: 3,
  nameMax: 60,
  membersMin: 2,
  membersMax: 20,
  amountMax: 1_000_000,
  amountDecimals: 2,
} as const;

/** Un monto escrito por la persona: dígitos y, opcional, coma o punto con hasta 2 decimales. */
const AMOUNT_PATTERN = new RegExp(`^\\d{1,7}([.,]\\d{1,${GROUP_LIMITS.amountDecimals}})?$`);

/** "37,5" → "37.50". Devuelve null si no es un monto válido. */
export function normalizeAmount(raw: string | null | undefined): string | null {
  const value = (raw ?? '').trim();
  if (!AMOUNT_PATTERN.test(value)) {
    return null;
  }
  const [int, frac = ''] = value.replace(',', '.').split('.');
  return `${Number(int)}.${frac.padEnd(GROUP_LIMITS.amountDecimals, '0')}`;
}

/** Valida el monto del aporte: formato, mayor que cero y por debajo del máximo. */
export const amountValidator: ValidatorFn = (control: AbstractControl): ValidationErrors | null => {
  const raw = String(control.value ?? '').trim();
  if (!raw) {
    return null; // de eso se encarga Validators.required
  }
  const normalized = normalizeAmount(raw);
  if (!normalized) {
    return { amountFormat: true };
  }
  const value = Number(normalized);
  if (value <= 0) {
    return { amountMin: true };
  }
  if (value > GROUP_LIMITS.amountMax) {
    return { amountMax: true };
  }
  return null;
};

/** Valida que sea un número entero. */
export const integerValidator: ValidatorFn = (control: AbstractControl): ValidationErrors | null => {
  const value = control.value;
  if (value === null || value === undefined || value === '') {
    return null;
  }
  return Number.isInteger(Number(value)) ? null : { integer: true };
};

/** Nombre sin espacios al principio ni al final para medir su largo real. */
export const trimmedLengthValidator =
  (min: number): ValidatorFn =>
  (control: AbstractControl): ValidationErrors | null => {
    const value = String(control.value ?? '');
    if (!value) {
      return null;
    }
    return value.trim().length < min ? { minTrimmed: { min } } : null;
  };
