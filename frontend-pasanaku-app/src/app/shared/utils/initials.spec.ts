import { initials } from './initials';

describe('initials', () => {
  it.each([
    ['Ana Quispe Mamani', 'AM'],
    ['María José de la Cruz y Fernández', 'MF'],
    ['Jo', 'J'],
    ['  Sam   Lee ', 'SL'],
    ['Christopher Alexander Montgomery III', 'CM'],
    ['Ólafur Darri Ólafsson', 'ÓÓ'],
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
