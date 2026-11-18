import type { PipeTransform } from '@angular/core';
import { Pipe } from '@angular/core';

/** Lo mínimo que el pipe necesita saber de la moneda (lo devuelve la API). */
export interface MoneyAsset {
  code: string;
  decimals: number;
}

const LOCALE = 'es-BO';
const NBSP = ' ';
const formatters = new Map<number, Intl.NumberFormat>();

function formatter(fractionDigits: number): Intl.NumberFormat {
  let f = formatters.get(fractionDigits);
  if (!f) {
    f = new Intl.NumberFormat(LOCALE, {
      minimumFractionDigits: fractionDigits,
      maximumFractionDigits: fractionDigits,
    });
    formatters.set(fractionDigits, f);
  }
  return f;
}

export interface MoneyParts {
  /** Número formateado, ej. "1.250,50". */
  number: string;
  /** Código de la moneda, ej. "BOB". */
  code: string;
}

/**
 * Formatea un monto y devuelve número y código por separado (para que la UI
 * decida dónde puede saltar de línea). `null` si el monto no es un número válido.
 */
export function formatMoneyParts(
  amount: string | number | null | undefined,
  asset: MoneyAsset,
  fractionDigits = 2,
): MoneyParts | null {
  if (amount === null || amount === undefined || amount === '') {
    return null;
  }
  const value = typeof amount === 'number' ? amount : Number(amount);
  if (!Number.isFinite(value)) {
    return null;
  }
  const digits = Math.max(0, Math.min(fractionDigits, asset.decimals));
  return { number: formatter(digits).format(value), code: asset.code };
}

/**
 * Formatea un monto con el código de su moneda: `'1250.5' | money: asset` → "1.250,50 BOB".
 *
 * - El código y los decimales salen de `asset` (de la API): no hay monedas fijas aquí.
 * - Muestra 2 decimales por defecto, nunca más de los que tiene la moneda.
 *   Pasa `asset.decimals` como segundo argumento para ver el monto exacto.
 * - Entre número y código va un espacio que no se corta, para que el código
 *   nunca quede solo en otra línea.
 * - Si el monto no es un número válido devuelve '' (nunca "NaN").
 */
@Pipe({ name: 'money' })
export class MoneyPipe implements PipeTransform {
  transform(amount: string | number | null | undefined, asset: MoneyAsset, fractionDigits = 2): string {
    const parts = formatMoneyParts(amount, asset, fractionDigits);
    return parts ? `${parts.number}${NBSP}${parts.code}` : '';
  }
}
