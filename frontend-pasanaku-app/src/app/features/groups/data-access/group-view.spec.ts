import { MOCK_CONTRIBUTIONS, MOCK_GROUPS } from '@core/data/groups.mock';
import type { Group } from '@core/models/domain.models';

import {
  currentRoundFund,
  groupProgressLabel,
  membersLabel,
  roundPayments,
  sortMyGroups,
  turnSteps,
} from './group-view';

const ANA = 'user-ana';
const byId = (id: string) => MOCK_GROUPS.find((g) => g.id === id) as Group;
const family = byId('group-familia-quispe');
const office = byId('group-oficina');
const entrepreneurs = byId('group-emprendedores-scz');
const promo = byId('group-viaje-promo');

describe('group-view', () => {
  it('ordena Mis grupos: en curso primero, cerrados al final', () => {
    const order = sortMyGroups([promo, entrepreneurs, office, family]).map((g) => g.status);
    expect(order).toEqual(['ACTIVE', 'ACTIVE', 'FORMING', 'COMPLETED']);
  });

  it('describe miembros y cupos con plurales correctos', () => {
    expect(membersLabel(entrepreneurs)).toBe('6 de 10 miembros');
    expect(groupProgressLabel(entrepreneurs, ANA)).toBe('4 cupos libres');
    expect(groupProgressLabel({ ...entrepreneurs, memberCount: 7 }, ANA)).toBe('1 cupo libre');
    expect(groupProgressLabel({ ...entrepreneurs, memberCount: 6 }, ANA)).toBe('Grupo completo');
  });

  it('avisa cuándo cobra el usuario', () => {
    expect(groupProgressLabel(family, ANA)).toMatch(/^Ronda 3 de 6 · Tu cobro: 15 dic/);
    expect(groupProgressLabel(promo, ANA)).toBe('4 rondas completadas');
  });

  it('calcula el fondo de la ronda en curso', () => {
    const fund = currentRoundFund(family, MOCK_CONTRIBUTIONS);
    expect(fund).toMatchObject({
      roundNumber: 3,
      collected: '2500.0000000',
      target: '3000.0000000',
      paidCount: 5,
      memberCount: 6,
    });
    expect(currentRoundFund(entrepreneurs, [])).toBeNull();
  });

  it('da el estado del aporte de cada miembro (sin registro = pendiente)', () => {
    const payments = roundPayments(family, MOCK_CONTRIBUTIONS, 3, ANA);
    expect(payments.map((p) => p.status)).toEqual(['PAID', 'PAID', 'PAID', 'PAID', 'LATE', 'PAID']);
    expect(payments.find((p) => p.isMe)?.member.displayName).toBe('Ana Quispe Mamani');
    expect(roundPayments(family, [], 4, ANA).every((p) => p.status === 'PENDING')).toBe(true);
  });

  it('arma la línea de turnos y resalta el turno del usuario', () => {
    const steps = turnSteps(family, ANA);
    expect(steps.map((s) => s.state)).toEqual(['done', 'done', 'current', 'upcoming', 'upcoming', 'upcoming']);
    expect(steps.filter((s) => s.highlight).map((s) => s.title)).toEqual(['Ana Quispe Mamani']);
    expect(turnSteps(entrepreneurs, ANA)).toEqual([]);
  });
});
