/** Partículas que no cuentan como apellido al sacar iniciales. */
const PARTICLES = new Set(['de', 'del', 'la', 'las', 'los', 'y', 'e', 'da', 'do', 'dos', 'van', 'von']);
/** Sufijos que no son un nombre. */
const SUFFIXES = new Set(['jr', 'jr.', 'sr', 'sr.', 'ii', 'iii', 'iv']);

/** Primer carácter visible de una palabra (respeta emojis y letras acentuadas). */
function firstGrapheme(word: string): string {
  const Seg = (Intl as unknown as { Segmenter?: typeof Intl.Segmenter }).Segmenter;
  if (Seg) {
    const first = new Seg('es', { granularity: 'grapheme' }).segment(word)[Symbol.iterator]().next();
    return first.done ? '' : first.value.segment;
  }
  return Array.from(word)[0] ?? '';
}

/**
 * Iniciales para un avatar: primer nombre + último apellido.
 * "Ana María" → "AM"; "María José de los Ángeles" → "MÁ"; "Jo" → "J".
 * Si el texto es un email, usa la parte antes de la @.
 */
export function initials(name: string): string {
  const base = name.includes('@') ? name.split('@')[0].replace(/[._-]+/g, ' ') : name;
  const words = base
    .trim()
    .split(/\s+/)
    .filter((w) => w && !PARTICLES.has(w.toLowerCase()) && !SUFFIXES.has(w.toLowerCase()));
  if (words.length === 0) {
    return '?';
  }
  const first = firstGrapheme(words[0]);
  const last = words.length > 1 ? firstGrapheme(words[words.length - 1]) : '';
  return (first + last).toLocaleUpperCase('es');
}
