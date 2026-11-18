/**
 * Fechas "solo día" (YYYY-MM-DD), calculadas en UTC para que la zona horaria
 * nunca corra un día.
 */

/** Hoy como "YYYY-MM-DD" (UTC). */
export function todayIso(now = new Date()): string {
  return now.toISOString().slice(0, 10);
}

function parse(dateOnly: string): Date {
  return new Date(`${dateOnly}T00:00:00Z`);
}

export function addDays(dateOnly: string, days: number): string {
  const d = parse(dateOnly);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

/** Suma meses sin desbordar: 31 ene + 1 mes = 28 (o 29) feb, no 3 mar. */
export function addMonths(dateOnly: string, months: number): string {
  const d = parse(dateOnly);
  const day = d.getUTCDate();
  d.setUTCDate(1);
  d.setUTCMonth(d.getUTCMonth() + months);
  const lastDay = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + 1, 0)).getUTCDate();
  d.setUTCDate(Math.min(day, lastDay));
  return d.toISOString().slice(0, 10);
}
