import type { GroupDetailFieldsFragment } from '@gql';

import { contributionsFromDetail, groupFromDetail, stroopsToAmount } from './group-mappers';

const member = (id: string, position: number, paid = false): GroupDetailFieldsFragment['members'][number] => ({
  id,
  userId: `user-${id}`,
  fullName: `Miembro ${id}`,
  reputationScore: 100,
  initialTurnOrder: position,
  currentQueuePosition: position,
  hasReceivedPayout: paid,
  joinedAt: '2026-11-01T00:00:00.000Z',
});

const DETAIL: GroupDetailFieldsFragment = {
  id: 'g1',
  name: 'Familia',
  creatorId: 'user-a',
  contributionStroops: '50000000',
  frequency: 'BIWEEKLY',
  maxParticipants: 3,
  memberCount: 3,
  isPublic: false,
  status: 'ACTIVE',
  currentRound: 2,
  roundDurationSeconds: 86400,
  createdAt: '2026-11-01T00:00:00.000Z',
  members: [member('a', 3, true), member('b', 1), member('c', 2)],
  debts: [],
  rounds: [
    {
      id: 'r1',
      roundNumber: 1,
      deadline: '2026-11-10T00:00:00.000Z',
      isSettled: true,
      beneficiaryMemberId: 'a',
      settleTxHash: 'hash-1',
      settledAt: '2026-11-11T00:00:00.000Z',
      payments: [],
    },
    {
      id: 'r2',
      roundNumber: 2,
      deadline: '2026-11-11T00:00:00.000Z',
      isSettled: false,
      beneficiaryMemberId: null,
      settleTxHash: null,
      settledAt: null,
      payments: [
        { id: 'p1', memberId: 'a', status: 'PAID', paidAt: '2026-11-10T12:00:00.000Z', txHash: null },
        { id: 'p2', memberId: 'b', status: 'PENDING', paidAt: null, txHash: null },
        { id: 'p3', memberId: 'c', status: 'DEFAULTED', paidAt: null, txHash: 'tx-servidor' },
      ],
    },
  ],
};

describe('group-mappers', () => {
  it('convierte stroops a monto decimal', () => {
    expect(stroopsToAmount('50000000')).toBe('5.0000000');
    expect(stroopsToAmount('125')).toBe('0.0000125');
  });

  it('proyecta las rondas que faltan con la cola de cobro', () => {
    const group = groupFromDetail(DETAIL);
    expect(group.rounds.map((r) => [r.number, r.recipientMemberId, r.status])).toEqual([
      [1, 'a', 'PAID_OUT'],
      [2, 'b', 'OPEN'],
      [3, 'c', 'UPCOMING'],
    ]);
    expect(group.rounds[2].dueDate).toBe('2026-11-12');
    expect(group.rounds[0].payoutTxHash).toBe('hash-1');
  });

  it('con el cupo lleno y sin iniciar, el grupo espera los turnos', () => {
    const group = groupFromDetail({ ...DETAIL, status: 'OPEN', currentRound: 0, rounds: [] });
    expect(group.status).toBe('ASSIGNING_TURNS');
    expect(group.members.every((m) => m.turnNumber === null)).toBe(true);
    expect(group.inviteCode).toBe('g1');
  });

  it('marca los grupos de demostración por la duración de la ronda', () => {
    expect(groupFromDetail({ ...DETAIL, roundDurationSeconds: 180 }).demoRoundSeconds).toBe(180);
    expect(groupFromDetail({ ...DETAIL, roundDurationSeconds: 1_209_600 }).demoRoundSeconds).toBeUndefined();
  });

  it('traduce las deudas con el número de ronda', () => {
    const group = groupFromDetail({
      ...DETAIL,
      debts: [
        {
          id: 'd1',
          debtorMemberId: 'c',
          beneficiaryMemberId: 'a',
          originalRoundId: 'r1',
          originalAmountStroops: '50000000',
          remainingAmountStroops: '20000000',
          status: 'PARTIALLY_PAID',
          lastPaymentTxHash: null,
        },
      ],
    });
    expect(group.debts).toEqual([
      expect.objectContaining({ roundNumber: 1, remaining: '2.0000000', original: '5.0000000', settled: false }),
    ]);
  });

  it('traduce los pagos a aportes', () => {
    const now = new Date('2026-11-10T20:00:00.000Z');
    const list = contributionsFromDetail(DETAIL, (_, id) => (id === 'a' ? 'tx-a' : undefined), now);
    expect(list.map((c) => [c.memberId, c.status, c.txHash])).toEqual([
      ['a', 'PAID', 'tx-a'],
      ['b', 'PENDING', undefined],
      ['c', 'LATE', 'tx-servidor'],
    ]);
  });
});
