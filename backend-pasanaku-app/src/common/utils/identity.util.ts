/**
 * Normaliza un celular a formato E.164.
 *  - "+591 71234567", "71234567", "59171234567" -> "+59171234567"
 *  - Otros números internacionales deben venir con "+" (ej. "+5491155551234").
 */
export function normalizePhone(input: string): string {
  const cleaned = String(input ?? '').replace(/[\s\-().]/g, '');

  if (/^\+[1-9]\d{7,14}$/.test(cleaned)) return cleaned;

  const bolivian = /^(?:591)?([67]\d{7})$/.exec(cleaned);
  if (bolivian) return `+591${bolivian[1]}`;

  throw new Error(
    'Celular inválido. Usa formato internacional (+591...) o un celular boliviano de 8 dígitos',
  );
}

/** Normaliza un CI boliviano: mayúsculas, sin espacios ni guiones ("1234567-1a" -> "12345671A"). */
export function normalizeCi(input: string): string {
  return String(input ?? '')
    .toUpperCase()
    .replace(/[\s-]/g, '');
}
