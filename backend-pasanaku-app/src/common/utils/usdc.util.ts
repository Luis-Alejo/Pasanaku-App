/**
 * USDC = 7 decimales (1 USDC = 10_000_000 stroops).
 * Montos en string (o bigint internamente), no number.
 */
export const USDC_DECIMALS = 7;
const SCALE = 10n ** BigInt(USDC_DECIMALS);

const USDC_REGEX = new RegExp(`^\\d+(\\.\\d{1,${USDC_DECIMALS}})?$`);
const STROOPS_REGEX = /^\d+$/;

/** Stroops (string) a bigint. */
export function parseStroops(stroops: string): bigint {
  if (typeof stroops !== 'string' || !STROOPS_REGEX.test(stroops.trim())) {
    throw new Error(`Monto en stroops inválido: "${String(stroops)}"`);
  }
  return BigInt(stroops.trim());
}

/**
 * "12.5" -> "125000000"
 * Rechaza negativos, notación científica y más de 7 decimales (no redondea ni trunca).
 */
export function usdcToStroops(usdc: string): string {
  if (typeof usdc !== 'string' || !USDC_REGEX.test(usdc.trim())) {
    throw new Error(
      `Monto USDC inválido: "${String(usdc)}" (máx. ${USDC_DECIMALS} decimales, sin signo)`,
    );
  }
  const [whole, fraction = ''] = usdc.trim().split('.');
  const stroops =
    BigInt(whole) * SCALE + BigInt(fraction.padEnd(USDC_DECIMALS, '0'));
  return stroops.toString();
}

/**
 * "125000000" -> "12.50"
 * Conserva al menos `minDecimals` (por defecto 2).
 */
export function stroopsToUsdc(
  stroops: string | bigint,
  minDecimals = 2,
): string {
  const value = typeof stroops === 'bigint' ? stroops : parseStroops(stroops);
  if (value < 0n) {
    throw new Error('El monto no puede ser negativo');
  }

  const decimals = Math.min(Math.max(minDecimals, 0), USDC_DECIMALS);
  const whole = value / SCALE;
  const fraction = (value % SCALE).toString().padStart(USDC_DECIMALS, '0');

  let trimmed = fraction.replace(/0+$/, '');
  if (trimmed.length < decimals) trimmed = trimmed.padEnd(decimals, '0');

  return trimmed === '' ? whole.toString() : `${whole}.${trimmed}`;
}
