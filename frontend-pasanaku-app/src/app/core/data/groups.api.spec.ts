import { MockGroupsApi } from '@core/data/groups.api';
import type { User } from '@core/models/domain.models';
import { JoinGroupError } from '@core/models/domain.models';

const ANA: User = { id: 'user-ana', displayName: 'Ana', email: 'ana@example.com', walletAddress: 'GANA' };
const OTHER = (n: number): User => ({
  id: `user-x${n}`,
  displayName: `X${n}`,
  email: `x${n}@example.com`,
  walletAddress: `GX${n}`,
});

describe('MockGroupsApi', () => {
  it('crea un grupo privado con código y al creador como miembro', async () => {
    const api = new MockGroupsApi();
    const group = await api.createGroup(
      {
        name: '  Amigos del barrio  ',
        contributionAmount: '100.00',
        assetCode: 'BOB',
        periodicity: 'MONTHLY',
        memberCount: 3,
        visibility: 'PRIVATE',
        turnMode: 'DRAW',
      },
      ANA,
    );
    expect(group.name).toBe('Amigos del barrio');
    expect(group.status).toBe('FORMING');
    expect(group.inviteCode).toMatch(/^[A-Z2-9]{6}$/);
    expect(group.members.map((m) => m.userId)).toEqual(['user-ana']);
    expect((await api.getGroupByCode(group.inviteCode!.toLowerCase()))?.id).toBe(group.id);
    expect((await api.getMyGroups('user-ana')).some((g) => g.id === group.id)).toBe(true);
  });

  it('une miembros y pasa a asignar turnos cuando el grupo se llena', async () => {
    const api = new MockGroupsApi();
    const { id } = await api.createGroup(
      {
        name: 'Tres',
        contributionAmount: '10.00',
        assetCode: 'USDC',
        periodicity: 'BIWEEKLY',
        memberCount: 3,
        visibility: 'PUBLIC',
        turnMode: 'AGREEMENT',
      },
      ANA,
    );
    expect((await api.joinGroup(id, OTHER(1))).status).toBe('FORMING');
    const full = await api.joinGroup(id, OTHER(2));
    expect(full.members.length).toBe(3);
    expect(full.status).toBe('ASSIGNING_TURNS');
  });

  it.each([
    ['NOT_FOUND', 'no-existe', ANA],
    ['ALREADY_MEMBER', 'group-familia-quispe', ANA],
    ['CLOSED', 'group-viaje-promo', OTHER(9)],
  ] as const)('rechaza unirse con %s', async (code, groupId, user) => {
    const api = new MockGroupsApi();
    await expect(api.joinGroup(groupId, user)).rejects.toEqual(new JoinGroupError(code));
  });

  it('no modifica los datos de prueba originales entre instancias', async () => {
    const first = new MockGroupsApi();
    await first.joinGroup('group-utiles-escolares', ANA);
    const second = new MockGroupsApi();
    expect((await second.getGroup('group-utiles-escolares'))?.members.length).toBe(3);
  });
});
