import { initials } from './initials';

describe('initials', () => {
  it.each([
    ['Ana María', 'AM'],
    ['María José de los Ángeles', 'MÁ'],
    ['Jo', 'J'],
    ['  Sam   Lee ', 'SL'],
    ['Christopher Alexander Montgomery III', 'CM'],
    ['Ólafur Darri', 'ÓD'],
    ['dana', 'D'],
    ['bartholomew.fitzgerald@northwind.example.com', 'BF'],
    ['', '?'],
  ])('%s → %s', (name, expected) => {
    expect(initials(name)).toBe(expected);
  });

  it('no parte un emoji a la mitad', () => {
    expect(initials('👩🏽‍💻 Priya')).toBe('👩🏽‍💻P');
  });
});
