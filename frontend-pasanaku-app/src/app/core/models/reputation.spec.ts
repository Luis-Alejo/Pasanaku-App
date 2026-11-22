import { REPUTATION, canUsePublicGroups, reputationLabel, reputationTone } from './reputation';

describe('reputación', () => {
  it.each([
    [200, 'excellent'],
    [150, 'excellent'],
    [100, 'good'],
    [99, 'fair'],
    [41, 'fair'],
    [40, 'low'],
    [0, 'low'],
  ] as const)('%s puntos → %s', (score, tone) => {
    expect(reputationTone(score)).toBe(tone);
  });

  it('con 40 o menos ya no permite grupos públicos', () => {
    expect(canUsePublicGroups(REPUTATION.publicLimit + 1)).toBe(true);
    expect(canUsePublicGroups(REPUTATION.publicLimit)).toBe(false);
    expect(canUsePublicGroups(undefined)).toBe(true);
  });

  it('etiqueta legible', () => {
    expect(reputationLabel(100)).toBe('Buena');
  });
});
