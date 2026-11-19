import { EntityManager } from 'typeorm';
import { GroupMember } from '../entities/group-member.entity.js';

/** Turnos protegidos (reputación < 80 no puede ocuparlos). Mismo cálculo entero que el contrato: ceil(N * 30%). */
export function protectedTurnSlots(total: number): number {
  return Math.floor((total * 30 + 99) / 100);
}

/**
 * Reescribe las posiciones de cola de un grupo respetando los índices únicos
 * (groupId, currentQueuePosition) y (groupId, initialTurnOrder): primero desplaza
 * todas las filas +1000 y luego asigna las posiciones finales.
 *
 * `orderedMemberIds` = cola pendiente; `trailingMemberIds` = miembros que ya cobraron (van al final).
 * Debe cubrir a TODOS los miembros del grupo.
 */
export async function applyQueueOrder(
  manager: EntityManager,
  groupId: string,
  orderedMemberIds: string[],
  opts: { initial?: boolean; trailingMemberIds?: string[] } = {},
): Promise<void> {
  const all = [...orderedMemberIds, ...(opts.trailingMemberIds ?? [])];
  if (new Set(all).size !== all.length)
    throw new Error('Cola con miembros duplicados');
  const total = await manager.countBy(GroupMember, { groupId });
  if (all.length !== total) {
    throw new Error(
      `La cola (${all.length}) no cubre a todos los miembros del grupo (${total})`,
    );
  }
  await manager.query(
    `UPDATE "group_members" SET "currentQueuePosition" = "currentQueuePosition" + 1000` +
      (opts.initial ? `, "initialTurnOrder" = "initialTurnOrder" + 1000` : '') +
      ` WHERE "groupId" = $1`,
    [groupId],
  );
  for (let i = 0; i < all.length; i++) {
    await manager.update(
      GroupMember,
      { id: all[i], groupId },
      opts.initial
        ? { currentQueuePosition: i + 1, initialTurnOrder: i + 1 }
        : { currentQueuePosition: i + 1 },
    );
  }
}
