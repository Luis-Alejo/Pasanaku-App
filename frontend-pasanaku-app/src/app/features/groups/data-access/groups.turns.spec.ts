import type { Group } from '@core/models/domain.models';
import { TurnError } from '@core/models/domain.models';

import { describeSwap, incomingProposals, isSwappable, swapCandidates, turnSlots } from './group-view';
import { MockGroupsApi } from './groups.api';
import { MOCK_GROUPS, MOCK_TURN_SWAPS } from './groups.mock';

const ANA = 'user-ana';
const byId = (id: string) => MOCK_GROUPS.find((g) => g.id === id) as Group;
const family = byId('group-familia-quispe');
const football = byId('group-equipo-futbol');

describe('turnos: funciones de vista', () => {
  it('lista los turnos libres y ocupados', () => {
    const slots = turnSlots(football, ANA);
    expect(slots.map((s) => s.member?.displayName ?? null)).toEqual([
      'Marco Antonio Vargas',
      'Luis Fernando Choque',
      null,
      'Diego Rojas',
      null,
    ]);
    expect(slots.some((s) => s.isMine)).toBe(false);
  });

  it('solo deja intercambiar turnos que no empezaron', () => {
    expect(isSwappable(family, 2)).toBe(false); // ya cobró
    expect(isSwappable(family, 3)).toBe(false); // ronda en curso
    expect(isSwappable(family, 4)).toBe(true);
    expect(isSwappable(family, null)).toBe(false);
  });

  it('ofrece candidatos sin propuesta pendiente con el usuario', () => {
    // María (turno 6) ya le propuso a Ana: no aparece; Luis (turno 5) sí.
    expect(swapCandidates(family, MOCK_TURN_SWAPS, ANA).map((m) => m.displayName)).toEqual(['Luis Fernando Choque']);
  });

  it('describe la propuesta desde el punto de vista del usuario', () => {
    const [incoming] = incomingProposals(family, MOCK_TURN_SWAPS, ANA);
    expect(describeSwap(incoming, family, ANA)).toMatchObject({
      direction: 'incoming',
      text: 'María Elena Gutiérrez te propone su turno 6 a cambio de tu turno 4.',
    });
  });
});

describe('turnos: MockGroupsApi', () => {
  it('modo acuerdo: al elegir el último turno libre el grupo empieza', async () => {
    const api = new MockGroupsApi();
    await expect(api.chooseTurn('group-equipo-futbol', ANA, 1)).rejects.toEqual(new TurnError('TURN_TAKEN'));
    expect((await api.chooseTurn('group-equipo-futbol', ANA, 3)).status).toBe('ASSIGNING_TURNS');
    const started = await api.chooseTurn('group-equipo-futbol', 'user-hugo', 5);
    expect(started.status).toBe('ACTIVE');
    expect(started.currentRound).toBe(1);
    expect(started.rounds.map((r) => r.status)).toEqual(['OPEN', 'UPCOMING', 'UPCOMING', 'UPCOMING', 'UPCOMING']);
    // La ronda 3 la cobra quien eligió el turno 3 (Ana).
    expect(started.members.find((m) => m.id === started.rounds[2].recipientMemberId)?.userId).toBe(ANA);
  });

  it('modo sorteo: asigna todos los turnos sin repetir y empieza', async () => {
    const api = new MockGroupsApi();
    const group = await api.runDraw('group-vecinos-edificio', ANA);
    expect(group.status).toBe('ACTIVE');
    expect(group.members.map((m) => m.turnNumber).sort()).toEqual([1, 2, 3, 4]);
    expect(group.turnsAssignedAt).toBeTruthy();
    await expect(api.runDraw('group-vecinos-edificio', ANA)).rejects.toEqual(new TurnError('NOT_ALLOWED'));
  });

  it('aceptar un intercambio cambia los turnos y quién cobra cada ronda', async () => {
    const api = new MockGroupsApi();
    const swap = await api.respondSwap('swap-fam-2', ANA, true);
    expect(swap.status).toBe('ACCEPTED');
    const group = (await api.getGroup('group-familia-quispe')) as Group;
    const turnOf = (userId: string) => group.members.find((m) => m.userId === userId)?.turnNumber;
    expect(turnOf(ANA)).toBe(6);
    expect(turnOf('user-maria')).toBe(4);
    const recipient = (n: number) => group.members.find((m) => m.id === group.rounds[n - 1].recipientMemberId)?.userId;
    expect(recipient(4)).toBe('user-maria');
    expect(recipient(6)).toBe(ANA);
  });

  it('rechazar no cambia nada y solo responde quien recibió la propuesta', async () => {
    const api = new MockGroupsApi();
    await expect(api.respondSwap('swap-fam-2', 'user-maria', false)).rejects.toEqual(new TurnError('NOT_MEMBER'));
    expect((await api.respondSwap('swap-fam-2', ANA, false)).status).toBe('REJECTED');
    const group = (await api.getGroup('group-familia-quispe')) as Group;
    expect(group.members.find((m) => m.userId === ANA)?.turnNumber).toBe(4);
  });

  it('no deja proponer turnos que ya empezaron ni repetir propuestas', async () => {
    const api = new MockGroupsApi();
    // Carmen (turno 3) está cobrando en la ronda en curso.
    await expect(api.proposeSwap('group-familia-quispe', ANA, 'm-fam-3')).rejects.toEqual(
      new TurnError('SWAP_NOT_ALLOWED'),
    );
    const swap = await api.proposeSwap('group-familia-quispe', ANA, 'm-fam-5');
    expect(swap).toMatchObject({ fromTurn: 4, toTurn: 5, status: 'PROPOSED' });
    await expect(api.proposeSwap('group-familia-quispe', ANA, 'm-fam-5')).rejects.toEqual(
      new TurnError('SWAP_NOT_ALLOWED'),
    );
  });
});
