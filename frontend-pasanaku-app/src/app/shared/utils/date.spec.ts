import { addDays, addMonths, todayIso } from './date';

describe('date', () => {
  it('da hoy en UTC', () => {
    expect(todayIso(new Date('2026-11-18T02:30:00-04:00'))).toBe('2026-11-18');
  });

  it('suma días cruzando meses y años', () => {
    expect(addDays('2026-11-17', 14)).toBe('2026-12-01');
    expect(addDays('2026-12-25', 14)).toBe('2027-01-08');
  });

  it('suma meses sin desbordar el fin de mes', () => {
    expect(addMonths('2026-11-17', 1)).toBe('2026-12-17');
    expect(addMonths('2027-01-31', 1)).toBe('2027-02-28');
    expect(addMonths('2028-01-31', 1)).toBe('2028-02-29');
    expect(addMonths('2026-10-31', 4)).toBe('2027-02-28');
  });
});
