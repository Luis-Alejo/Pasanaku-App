import { MoneyPipe, formatMoneyParts } from './money.pipe';

const NBSP = ' ';
const BOB = { code: 'BOB', decimals: 7 };
const USDC = { code: 'USDC', decimals: 7 };

describe('MoneyPipe', () => {
  const pipe = new MoneyPipe();

  it('formatea con separadores de Bolivia y 2 decimales', () => {
    expect(pipe.transform('1250.5', BOB)).toBe(`1.250,50${NBSP}BOB`);
    expect(pipe.transform('500.0000000', BOB)).toBe(`500,00${NBSP}BOB`);
  });

  it('usa el código que llega de la API', () => {
    expect(pipe.transform(50, USDC)).toBe(`50,00${NBSP}USDC`);
    expect(pipe.transform(50, { code: 'BOBT', decimals: 7 })).toBe(`50,00${NBSP}BOBT`);
  });

  it('no muestra más decimales de los que tiene la moneda', () => {
    expect(pipe.transform('10.5', { code: 'XYZ', decimals: 0 })).toBe(`11${NBSP}XYZ`);
    expect(pipe.transform('1.1234567', USDC, 7)).toBe(`1,1234567${NBSP}USDC`);
  });

  it('formatea montos enormes y negativos', () => {
    expect(pipe.transform('1234567890.99', USDC)).toBe(`1.234.567.890,99${NBSP}USDC`);
    expect(pipe.transform('-25', BOB)).toBe(`-25,00${NBSP}BOB`);
  });

  it('devuelve vacío para valores que no son montos', () => {
    expect(pipe.transform(null, BOB)).toBe('');
    expect(pipe.transform(undefined, BOB)).toBe('');
    expect(pipe.transform('', BOB)).toBe('');
    expect(pipe.transform('abc', BOB)).toBe('');
    expect(pipe.transform(Number.NaN, BOB)).toBe('');
  });
});

describe('formatMoneyParts', () => {
  it('separa número y código', () => {
    expect(formatMoneyParts('1234567890.99', { code: 'BOBTESTNET12', decimals: 7 })).toEqual({
      number: '1.234.567.890,99',
      code: 'BOBTESTNET12',
    });
  });

  it('devuelve null para montos inválidos', () => {
    expect(formatMoneyParts('NaN', BOB)).toBeNull();
    expect(formatMoneyParts(null, BOB)).toBeNull();
  });
});
