/** stroops -> "25.00" (mínimo 2 decimales, sin ceros de relleno hasta 7). */
export function formatUsdc(stroops: string | bigint): string {
  const s = BigInt(stroops);
  const frac = (s % 10_000_000n)
    .toString()
    .padStart(7, '0')
    .replace(/0+$/, '')
    .padEnd(2, '0');
  return `${s / 10_000_000n}.${frac}`;
}

export function formatBoliviaDate(d: Date): string {
  return d.toLocaleString('es-BO', {
    timeZone: 'America/La_Paz',
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  });
}
