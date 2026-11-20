/** Aritmética entera BOB <-> USDC. Tasa escalada x10 000 (4 decimales, como `exchangeRate`). */
const RATE_SCALE = 10_000n;

export function rateToScaled(rate: number | string): bigint {
  const scaled = BigInt(Math.round(Number(rate) * Number(RATE_SCALE)));
  if (scaled <= 0n) throw new Error('Tasa de cambio inválida');
  return scaled;
}

export function parseBobToCents(value: string): bigint {
  if (!/^\d+(\.\d{1,2})?$/.test(value))
    throw new Error('Monto en BOB inválido');
  const [int, dec = ''] = value.split('.');
  return BigInt(int) * 100n + BigInt(dec.padEnd(2, '0'));
}

export function centsToBobString(cents: bigint): string {
  return `${cents / 100n}.${(cents % 100n).toString().padStart(2, '0')}`;
}

/** BOB (centavos) -> stroops de USDC, redondeo hacia abajo. */
export function bobCentsToStroops(cents: bigint, rate4: bigint): bigint {
  return (cents * 1_000_000_000n) / rate4;
}

/** stroops de USDC -> BOB (centavos), redondeo hacia ARRIBA (el usuario nunca paga de menos). */
export function stroopsToBobCents(stroops: bigint, rate4: bigint): bigint {
  const num = stroops * rate4;
  const den = 1_000_000_000n;
  return (num + den - 1n) / den;
}

export function stroopsToDecimal(stroops: bigint): string {
  return `${stroops / 10_000_000n}.${(stroops % 10_000_000n).toString().padStart(7, '0')}`;
}

export function rateToString(rate4: bigint): string {
  return `${rate4 / RATE_SCALE}.${(rate4 % RATE_SCALE).toString().padStart(4, '0')}`;
}
