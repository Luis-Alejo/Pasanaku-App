/**
 * Puerto hacia groups/: users/ no conoce las entidades de grupos.
 * groups/ debe proveer una implementación con este token (módulo @Global()).
 */
export const GROUP_OBLIGATIONS_PORT = Symbol('GROUP_OBLIGATIONS_PORT');

export interface GroupObligationsPort {
  /**
   * true si `requesterId` es creador/administrador del grupo `groupId`, `memberId`
   * pertenece a ese grupo y tiene un incumplimiento activo
   * (RoundPayment DEFAULTED o MemberDebt OPEN/PARTIALLY_PAID).
   */
  canViewDefaulterReferences(params: {
    requesterId: string;
    groupId: string;
    memberId: string;
  }): Promise<boolean>;

  /** true si el usuario está en un grupo OPEN/ACTIVE o tiene deudas pendientes. */
  hasActiveObligations(userId: string): Promise<boolean>;
}
