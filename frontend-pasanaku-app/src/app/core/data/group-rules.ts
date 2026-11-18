import type { Group } from '@core/models/domain.models';

/**
 * Reglas del dominio que usan tanto la fuente de datos (mock) como las pantallas.
 * Cuando exista el contrato, estas reglas las aplica el backend; aquí solo se
 * reflejan para mostrar u ocultar acciones.
 */

/** Un turno se puede intercambiar si está asignado y su ronda todavía no empezó. */
export function isSwappable(group: Group, turn: number | null): boolean {
  if (turn === null) return false;
  if (group.status === 'ASSIGNING_TURNS') return true;
  if (group.status !== 'ACTIVE') return false;
  return group.rounds.find((r) => r.number === turn)?.status === 'UPCOMING';
}
