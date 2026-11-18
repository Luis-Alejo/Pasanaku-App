import { MOCK_CONTRIBUTIONS, MOCK_GROUPS, MOCK_TURN_SWAPS } from '@core/data/groups.mock';
import type { Contribution, TurnSwap } from '@core/models/domain.models';

import { activeGroups, firstName, nextPayout, pendingPayments, todos } from './home-view';

const ANA = 'user-ana';
const TODAY = '2026-11-18';
const mine = MOCK_GROUPS.filter((g) => g.members.some((m) => m.userId === ANA));
const byGroup = <T extends { groupId: string }>(items: T[]) =>
  items.reduce<Record<string, T[]>>((acc, x) => ({ ...acc, [x.groupId]: [...(acc[x.groupId] ?? []), x] }), {});
const contributions = byGroup<Contribution>(MOCK_CONTRIBUTIONS);
const swaps = byGroup<TurnSwap>(MOCK_TURN_SWAPS);

describe('home-view', () => {
  it('lista el aporte pendiente de Ana (oficina) y no los ya pagados', () => {
    const pending = pendingPayments(mine, contributions, ANA, TODAY);
    expect(pending.map((p) => [p.group.id, p.status])).toEqual([['group-oficina', 'PENDING']]);
  });

  it('marca atrasado si pasó la fecha límite y lo pone primero', () => {
    const pending = pendingPayments(mine, contributions, ANA, '2026-12-01');
    expect(pending[0]).toMatchObject({ status: 'LATE' });
  });

  it('encuentra el cobro más cercano', () => {
    const payout = nextPayout(mine, ANA);
    expect(payout).toMatchObject({ isCurrent: false, amount: '250.0000000' });
    expect(payout?.group.id).toBe('group-oficina'); // 14 dic, antes que el 15 dic de la familia
  });

  it('junta lo pendiente: propuesta de intercambio, elegir turno y sorteo', () => {
    expect(todos(mine, swaps, ANA).map((t) => [t.kind, t.group.id])).toEqual([
      ['choose-turn', 'group-equipo-futbol'],
      ['draw', 'group-vecinos-edificio'],
      ['swap', 'group-familia-quispe'],
    ]);
  });

  it('filtra los grupos en curso y saluda por el primer nombre', () => {
    expect(activeGroups(mine).map((g) => g.name)).toEqual(['Ahorro compañeros de oficina', 'Pasanaku familia Quispe']);
    expect(firstName('  Ana Quispe Mamani ')).toBe('Ana');
  });
});
