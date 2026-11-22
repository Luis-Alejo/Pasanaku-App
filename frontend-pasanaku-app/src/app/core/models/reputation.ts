/**
 * Reputación de cada persona (decisión del equipo):
 * - Empieza en 100 y sube hasta 200 al completar grupos sin faltas.
 * - Baja con cada incumplimiento.
 * - Con 40 o menos ya no se puede crear ni unirse a grupos públicos.
 *
 * La fuente de verdad es el contrato `reputation_registry` (Luis). Estos límites
 * deben coincidir con los del contrato.
 */
export const REPUTATION = {
  start: 100,
  max: 200,
  /** Con este puntaje o menos, no se permiten grupos públicos. */
  publicLimit: 40,
} as const;

export type ReputationTone = 'excellent' | 'good' | 'fair' | 'low';

/** Nivel para el color y la etiqueta. */
export function reputationTone(score: number): ReputationTone {
  if (score <= REPUTATION.publicLimit) return 'low';
  if (score < REPUTATION.start) return 'fair';
  if (score < 150) return 'good';
  return 'excellent';
}

const LABELS: Record<ReputationTone, string> = {
  excellent: 'Excelente',
  good: 'Buena',
  fair: 'Regular',
  low: 'Baja',
};

export function reputationLabel(score: number): string {
  return LABELS[reputationTone(score)];
}

/** ¿Puede crear o unirse a grupos públicos con este puntaje? */
export function canUsePublicGroups(score: number | undefined): boolean {
  return score === undefined || score > REPUTATION.publicLimit;
}
