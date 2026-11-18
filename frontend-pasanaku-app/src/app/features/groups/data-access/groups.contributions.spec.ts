import { MockGroupsApi } from '@core/data/groups.api';
import { MOCK_CONTRIBUTIONS, MOCK_GROUPS, MOCK_TURN_SWAPS } from '@core/data/groups.mock';
import type { Group } from '@core/models/domain.models';
import { ContributionError } from '@core/models/domain.models';

import { historyEvents } from './group-view';

const ANA = 'user-ana';

describe('aportes y desembolso: MockGroupsApi', () => {
  it('registra el aporte con su transacción', async () => {
    const api = new MockGroupsApi(0);
    const { contribution, payout, group } = await api.contribute('group-oficina', ANA);
    expect(contribution).toMatchObject({ roundNumber: 1, status: 'PAID', amount: '50.0000000' });
    expect(contribution.txHash).toMatch(/^[0-9a-f]{64}$/);
    expect(payout).toBeUndefined(); // Marco todavía no aportó
    expect(group.currentRound).toBe(1);
    await expect(api.contribute('group-oficina', ANA)).rejects.toEqual(new ContributionError('ALREADY_PAID'));
  });

  it('cuando aportan todos, desembolsa al del turno y abre la ronda siguiente', async () => {
    const api = new MockGroupsApi(0);
    await api.contribute('group-oficina', ANA);
    const result = await api.simulatePendingContributions('group-oficina', ANA);
    expect(result?.payout).toMatchObject({ roundNumber: 1, recipientMemberId: 'm-ofi-1', amount: '250.0000000' });
    const group = result?.group as Group;
    expect(group.rounds[0].status).toBe('PAID_OUT');
    expect(group.rounds[1].status).toBe('OPEN');
    expect(group.currentRound).toBe(2);
  });

  it('un aporte atrasado también cuenta y completa la ronda', async () => {
    const api = new MockGroupsApi(0);
    // En la familia Quispe solo falta Luis (atrasado).
    const { payout, group } = await api.contribute('group-familia-quispe', 'user-luis');
    expect(payout?.recipientMemberId).toBe('m-fam-3');
    expect(group.currentRound).toBe(4);
  });

  it('al pagar la última ronda el grupo queda cerrado', async () => {
    const api = new MockGroupsApi(0);
    // Equipo de fútbol: completar turnos para que empiece (5 rondas).
    await api.chooseTurn('group-equipo-futbol', ANA, 3);
    await api.chooseTurn('group-equipo-futbol', 'user-hugo', 5);
    let group: Group | undefined;
    for (let round = 1; round <= 5; round++) {
      await api.contribute('group-equipo-futbol', ANA);
      group = (await api.simulatePendingContributions('group-equipo-futbol', ANA))?.group;
    }
    expect(group?.status).toBe('COMPLETED');
    expect(group?.currentRound).toBeNull();
    await expect(api.contribute('group-equipo-futbol', ANA)).rejects.toEqual(new ContributionError('NOT_ACTIVE'));
  });

  it('no deja aportar a quien no es miembro ni en grupos sin ronda abierta', async () => {
    const api = new MockGroupsApi(0);
    await expect(api.contribute('group-oficina', 'user-x')).rejects.toEqual(new ContributionError('NOT_MEMBER'));
    await expect(api.contribute('group-equipo-futbol', ANA)).rejects.toEqual(new ContributionError('NOT_ACTIVE'));
  });
});

describe('historyEvents', () => {
  const family = MOCK_GROUPS.find((g) => g.id === 'group-familia-quispe') as Group;
  const events = historyEvents(family, MOCK_CONTRIBUTIONS, MOCK_TURN_SWAPS, ANA);

  it('ordena del más reciente al más antiguo y termina con la creación', () => {
    const dates = events.map((e) => e.at);
    expect([...dates].sort().reverse()).toEqual(dates);
    expect(events.at(-1)?.kind).toBe('created');
  });

  it('incluye aportes, cobros con su transacción e intercambios aceptados', () => {
    const count = (kind: string) => events.filter((e) => e.kind === kind).length;
    expect(count('contribution')).toBe(17); // 6 + 6 + 5 pagados
    expect(count('payout')).toBe(2);
    expect(count('swap')).toBe(1); // solo el aceptado
    expect(events.filter((e) => e.kind === 'payout').every((e) => e.txHash && e.amount === '3000.0000000')).toBe(true);
  });

  it('a igual hora muestra primero el desembolso que el aporte que lo completó', () => {
    const at = '2026-11-20T10:00:00.000Z';
    const g: Group = {
      ...family,
      rounds: family.rounds.map((r) => (r.number === 3 ? { ...r, status: 'PAID_OUT', paidOutAt: at } : r)),
    };
    const contributions = MOCK_CONTRIBUTIONS.map((c) =>
      c.id === 'group-familia-quispe-r3-m-fam-5' ? { ...c, status: 'PAID' as const, paidAt: at, txHash: 'x' } : c,
    );
    const [first, second] = historyEvents(g, contributions, [], ANA);
    expect([first.kind, second.kind]).toEqual(['payout', 'contribution']);
  });

  it('marca los movimientos propios', () => {
    const mine = events.filter((e) => e.isMine && e.kind === 'contribution');
    expect(mine.length).toBe(3);
    expect(mine.every((e) => e.title === 'Aportaste')).toBe(true);
  });
});
