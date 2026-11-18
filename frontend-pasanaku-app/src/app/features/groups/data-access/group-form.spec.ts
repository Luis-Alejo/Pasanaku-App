import { FormControl } from '@angular/forms';

import { amountValidator, integerValidator, normalizeAmount, trimmedLengthValidator } from './group-form';

describe('group-form', () => {
  it('normaliza montos con coma o punto', () => {
    expect(normalizeAmount('500')).toBe('500.00');
    expect(normalizeAmount('37,5')).toBe('37.50');
    expect(normalizeAmount(' 12.25 ')).toBe('12.25');
    expect(normalizeAmount('007')).toBe('7.00');
  });

  it('rechaza montos con formato inválido', () => {
    for (const bad of ['', 'abc', '1.250,50', '1,234', '10.999', '-5', '1e3']) {
      expect(normalizeAmount(bad)).toBeNull();
    }
  });

  it('valida monto mayor a cero y bajo el máximo', () => {
    expect(amountValidator(new FormControl('0'))).toEqual({ amountMin: true });
    expect(amountValidator(new FormControl('1000001'))).toEqual({ amountMax: true });
    expect(amountValidator(new FormControl('12,3456'))).toEqual({ amountFormat: true });
    expect(amountValidator(new FormControl('500'))).toBeNull();
    expect(amountValidator(new FormControl(''))).toBeNull();
  });

  it('valida enteros', () => {
    expect(integerValidator(new FormControl(6))).toBeNull();
    expect(integerValidator(new FormControl(2.5))).toEqual({ integer: true });
  });

  it('mide el nombre sin espacios sobrantes', () => {
    expect(trimmedLengthValidator(3)(new FormControl('  ab  '))).toEqual({ minTrimmed: { min: 3 } });
    expect(trimmedLengthValidator(3)(new FormControl('Ana'))).toBeNull();
  });
});
