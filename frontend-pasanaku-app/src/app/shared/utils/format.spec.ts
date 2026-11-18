import { formatDate, multiplyAmount, plural, sumAmounts } from './format';

describe('formatDate', () => {
  it('no corre la fecha un día por la zona horaria', () => {
    expect(formatDate('2026-11-15')).toMatch(/^15 nov/);
    expect(formatDate('2026-11-15', true)).toMatch(/^15 nov.* 2026$/);
  });

  it('devuelve vacío si la fecha no es válida', () => {
    expect(formatDate('no-es-fecha')).toBe('');
  });
});

describe('plural', () => {
  it('elige singular o plural', () => {
    expect(plural(1, 'miembro', 'miembros')).toBe('miembro');
    expect(plural(0, 'miembro', 'miembros')).toBe('miembros');
    expect(plural(6, 'miembro', 'miembros')).toBe('miembros');
  });
});

describe('sumAmounts', () => {
  it('suma sin errores de coma flotante', () => {
    expect(sumAmounts(['0.1000000', '0.2000000'], 7)).toBe('0.3000000');
    expect(sumAmounts(['500.0000000', '500', '500.5'], 7)).toBe('1500.5000000');
  });

  it('maneja listas vacías y negativos', () => {
    expect(sumAmounts([], 7)).toBe('0.0000000');
    expect(sumAmounts(['-25.5', '10'], 2)).toBe('-15.50');
  });

  it('multiplica un monto', () => {
    expect(multiplyAmount('500.0000000', 6, 7)).toBe('3000.0000000');
    expect(multiplyAmount('50', 0, 7)).toBe('0.0000000');
  });
});
