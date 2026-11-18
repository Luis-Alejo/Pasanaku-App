/**
 * Tipos PROVISIONALES del dominio (CLAUDE.md, glosario de la sección 2).
 *
 * Existen solo mientras no esté el esquema GraphQL del backend. Cuando exista
 * `graphql/generated.ts` (paso 9), reemplázalos por los tipos de `@gql` y borra
 * este archivo: los nombres de campos y enums que mandan son los del backend.
 *
 * Convenciones:
 * - Montos como `string` decimal ("500.0000000"), igual que los devuelve
 *   Stellar, para no perder precisión con `number`.
 * - Fechas como `string` ISO 8601 (así llegan por GraphQL).
 */

/** Unidad de los aportes. Código y decimales vienen de la API: nunca los fijes en el código. */
export interface Asset {
  /** Código del activo, por ejemplo "USDC" o "BOB". */
  code: string;
  /** Decimales del activo en la red (Stellar usa 7). */
  decimals: number;
  /** Emisor del activo en Stellar, si aplica. */
  issuer?: string;
}

export type GroupVisibility = 'PUBLIC' | 'PRIVATE';

export type TurnMode = 'AGREEMENT' | 'DRAW';

/** POR CONFIRMAR con backend: opciones exactas de periodicidad. */
export type Periodicity = 'BIWEEKLY' | 'MONTHLY';

/**
 * Ciclo de vida: Creación → Incorporación de miembros → Asignación de turnos
 * → Aportes por periodo → Desembolso → Cierre.
 */
export type GroupStatus = 'FORMING' | 'ASSIGNING_TURNS' | 'ACTIVE' | 'COMPLETED';

export interface Member {
  id: string;
  userId: string;
  displayName: string;
  /** Cuenta Stellar pública (G...). Nunca una clave secreta. */
  walletAddress: string;
  /** Posición en el orden de cobro; `null` mientras no se asignan turnos. */
  turnNumber: number | null;
  joinedAt: string;
}

export type RoundStatus = 'UPCOMING' | 'OPEN' | 'PAID_OUT';

/** Una ronda: cada periodo en que un miembro cobra (turno). */
export interface Round {
  number: number;
  /** Fecha límite para aportar en esta ronda. */
  dueDate: string;
  /** Miembro que cobra en esta ronda. */
  recipientMemberId: string;
  status: RoundStatus;
  /** Transacción del desembolso en Testnet (solo si ya se pagó). */
  payoutTxHash?: string;
  paidOutAt?: string;
}

export type ContributionStatus = 'PAID' | 'PENDING' | 'LATE';

export interface Contribution {
  id: string;
  groupId: string;
  memberId: string;
  roundNumber: number;
  amount: string;
  status: ContributionStatus;
  paidAt?: string;
  /** Transacción del aporte en Testnet (solo si está pagado). */
  txHash?: string;
}

export type TurnSwapStatus = 'PROPOSED' | 'ACCEPTED' | 'REJECTED';

/** Propuesta entre dos miembros para cambiar sus turnos (modo acuerdo). */
export interface TurnSwap {
  id: string;
  groupId: string;
  fromMemberId: string;
  toMemberId: string;
  fromTurn: number;
  toTurn: number;
  status: TurnSwapStatus;
  createdAt: string;
  respondedAt?: string;
}

export interface Group {
  id: string;
  name: string;
  /** Monto fijo que aporta cada miembro por ronda. */
  contributionAmount: string;
  asset: Asset;
  periodicity: Periodicity;
  /** Número de miembros (y de rondas) del ciclo. */
  memberCount: number;
  visibility: GroupVisibility;
  turnMode: TurnMode;
  status: GroupStatus;
  /** Código para unirse a un grupo privado (/join/:code). */
  inviteCode?: string;
  members: Member[];
  rounds: Round[];
  /** Número de la ronda en curso; `null` si el ciclo no empezó o ya cerró. */
  currentRound: number | null;
  /** Cuándo quedó definido el orden de cobro (elección completa o sorteo). */
  turnsAssignedAt?: string;
  createdAt: string;
}

/** Datos para crear un grupo (formulario "Crear grupo"). */
export interface CreateGroupInput {
  name: string;
  /** Monto decimal con punto, ej. "500.00". */
  contributionAmount: string;
  /** Código de la moneda elegida, de las que devuelve la API. */
  assetCode: string;
  periodicity: Periodicity;
  memberCount: number;
  visibility: GroupVisibility;
  turnMode: TurnMode;
}

/** Por qué no se pudo unir alguien a un grupo. */
export type JoinGroupErrorCode = 'NOT_FOUND' | 'ALREADY_MEMBER' | 'FULL' | 'CLOSED';

export class JoinGroupError extends Error {
  constructor(readonly code: JoinGroupErrorCode) {
    super(code);
    this.name = 'JoinGroupError';
  }
}

/** Por qué no se pudo hacer una acción de turnos. */
export type TurnErrorCode =
  | 'NOT_FOUND'
  | 'NOT_MEMBER'
  /** El grupo no está en la etapa o el modo que permite la acción. */
  | 'NOT_ALLOWED'
  | 'TURN_TAKEN'
  /** Uno de los turnos ya pasó o ya está en curso, o ya hay una propuesta pendiente. */
  | 'SWAP_NOT_ALLOWED';

export class TurnError extends Error {
  constructor(readonly code: TurnErrorCode) {
    super(code);
    this.name = 'TurnError';
  }
}

/** Desembolso (cobro) de una ronda al miembro del turno. En el MVP es simulado. */
export interface Payout {
  roundNumber: number;
  recipientMemberId: string;
  amount: string;
  txHash: string;
  paidOutAt: string;
}

/** Resultado de registrar un aporte. */
export interface ContributeResult {
  contribution: Contribution;
  group: Group;
  /** Si este aporte completó la ronda, el desembolso que se hizo. */
  payout?: Payout;
}

export type ContributionErrorCode = 'NOT_FOUND' | 'NOT_MEMBER' | 'NOT_ACTIVE' | 'ALREADY_PAID';

export class ContributionError extends Error {
  constructor(readonly code: ContributionErrorCode) {
    super(code);
    this.name = 'ContributionError';
  }
}

/** Usuario con sesión iniciada. */
export interface User {
  id: string;
  displayName: string;
  email: string;
  walletAddress: string;
}
