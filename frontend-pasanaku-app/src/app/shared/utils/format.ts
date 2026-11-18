const LOCALE = 'es-BO';

const dayMonth = new Intl.DateTimeFormat(LOCALE, { day: 'numeric', month: 'short', timeZone: 'UTC' });
const dayMonthYear = new Intl.DateTimeFormat(LOCALE, {
  day: 'numeric',
  month: 'short',
  year: 'numeric',
  timeZone: 'UTC',
});
const plurals = new Intl.PluralRules(LOCALE);

/**
 * Formatea una fecha "YYYY-MM-DD" (o ISO completa) como "15 nov" o "15 nov 2026".
 * Se formatea en UTC: una fecha sin hora no debe correrse un día por la zona horaria
 * (en Bolivia, UTC-4, "2026-11-15" sería el 14 a las 20:00).
 */
export function formatDate(value: string, withYear = false): string {
  const date = new Date(value.length === 10 ? `${value}T00:00:00Z` : value);
  if (Number.isNaN(date.getTime())) {
    return '';
  }
  return (withYear ? dayMonthYear : dayMonth).format(date);
}

/** "1 miembro", "6 miembros": elige la forma según la cantidad. */
export function plural(count: number, one: string, other: string): string {
  return plurals.select(count) === 'one' ? one : other;
}

/**
 * Suma montos decimales en texto ("500.0000000") sin errores de coma flotante.
 * Devuelve el total con `decimals` decimales.
 */
export function sumAmounts(amounts: string[], decimals: number): string {
  const scale = 10n ** BigInt(decimals);
  const toUnits = (amount: string): bigint => {
    const negative = amount.trim().startsWith('-');
    const [int, frac = ''] = amount.trim().replace('-', '').split('.');
    const units = BigInt(int || '0') * scale + BigInt((frac + '0'.repeat(decimals)).slice(0, decimals) || '0');
    return negative ? -units : units;
  };
  const total = amounts.reduce((acc, a) => acc + toUnits(a), 0n);
  const sign = total < 0n ? '-' : '';
  const abs = total < 0n ? -total : total;
  const int = abs / scale;
  const frac = (abs % scale).toString().padStart(decimals, '0');
  return decimals > 0 ? `${sign}${int}.${frac}` : `${sign}${int}`;
}

/** Multiplica un monto decimal en texto por un entero, sin perder precisión. */
export function multiplyAmount(amount: string, times: number, decimals: number): string {
  return sumAmounts(
    Array.from({ length: times }, () => amount),
    decimals,
  );
}
