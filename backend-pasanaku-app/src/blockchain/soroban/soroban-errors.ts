export type ContractKind = 'pasanaku' | 'registry';

/** Errores de `PasanakuContract` (pasanaku/src/lib.rs). Los números son los del contrato. */
export enum PasanakuErrorCode {
  AlreadyInitialized = 1,
  NotInitialized = 2,
  Unauthorized = 3,
  InvalidAmount = 4,
  InvalidDuration = 5,
  InvalidParticipantLimit = 6,
  GroupNotOpen = 7,
  GroupNotActive = 8,
  GroupFull = 9,
  NotInvited = 10,
  AlreadyMember = 11,
  NotMember = 12,
  InvalidTurnOrder = 13,
  NotEnoughMembers = 14,
  AlreadyPaid = 15,
  GracePeriodOver = 16,
  TooEarly = 17,
  InvalidState = 18,
  Overflow = 19,
  DebtNotFound = 20,
  DebtAmountTooLarge = 21,
  EmptyQueue = 22,
  LowReputationForEarlyTurn = 23,
  InvalidStateForDistribution = 24,
}

/** Errores de `ReputationRegistry` (reputation_registry/src/lib.rs). */
export enum RegistryErrorCode {
  AlreadyInitialized = 1,
  NotInitialized = 2,
  Unauthorized = 3,
  AlreadyProcessed = 4,
  Overflow = 5,
}

/** El contrato rechazó la llamada con uno de sus `Error` definidos. */
export class SorobanContractError extends Error {
  constructor(
    readonly contract: ContractKind,
    readonly code: number,
    readonly errorName: string,
    readonly rawMessage: string,
  ) {
    super(`${contract}: ${errorName} (#${code})`);
    this.name = 'SorobanContractError';
  }
}

/** La simulación falló por otra causa (recursos, trap, red...). */
export class SorobanSimulationError extends Error {
  constructor(
    message: string,
    readonly cause?: unknown,
  ) {
    super(message);
    this.name = 'SorobanSimulationError';
  }
}

/** El contrato del grupo se desplegó pero un paso posterior falló (hay que reanudar desde `step`). */
export class GroupDeploymentError extends Error {
  constructor(
    readonly contractId: string,
    readonly step: 'init' | 'authorize_registry',
    readonly cause: unknown,
  ) {
    super(
      `Contrato ${contractId} desplegado, pero falló el paso "${step}": ${(cause as Error)?.message}`,
    );
    this.name = 'GroupDeploymentError';
  }
}

const CONTRACT_ERROR = /Error\(Contract,\s*#(\d+)\)/;

/**
 * Convierte el mensaje de error del RPC en un error tipado.
 * Limitación: si el error nace en OTRO contrato dentro de una llamada cruzada
 * (p. ej. el registry dentro de settle_round) el número se interpretaría con la tabla
 * del contrato invocado; el mensaje crudo (`rawMessage`) conserva el detalle.
 */
export function toSorobanError(
  kind: ContractKind,
  message: string,
  cause?: unknown,
): Error {
  const match = CONTRACT_ERROR.exec(message);
  if (!match) return new SorobanSimulationError(message, cause);

  const code = Number(match[1]);
  const table: Record<number, string> =
    kind === 'pasanaku'
      ? (PasanakuErrorCode as unknown as Record<number, string>)
      : (RegistryErrorCode as unknown as Record<number, string>);
  return new SorobanContractError(
    kind,
    code,
    table[code] ?? 'Unknown',
    message,
  );
}
