/** La red aceptó la transacción pero terminó en FAILED. No tiene sentido reintentarla igual. */
export class StellarTransactionFailedError extends Error {
  constructor(
    readonly txHash: string,
    readonly resultCode: string,
  ) {
    super(`La transacción ${txHash} falló en la red (${resultCode})`);
    this.name = 'StellarTransactionFailedError';
  }
}

/** La red rechazó la transacción al enviarla (sin llegar a incluirse). */
export class StellarSubmissionError extends Error {
  constructor(
    readonly txHash: string,
    readonly resultCode: string,
  ) {
    super(`La red rechazó la transacción ${txHash} (${resultCode})`);
    this.name = 'StellarSubmissionError';
  }
}

/**
 * La transacción venció (timebounds) sin incluirse: es seguro reconstruirla con un
 * sequence nuevo. Se lanza solo después de consultar su hash en RPC y Horizon.
 */
export class StellarTransactionExpiredError extends Error {
  constructor(readonly txHash: string) {
    super(`La transacción ${txHash} venció sin incluirse en un ledger`);
    this.name = 'StellarTransactionExpiredError';
  }
}

/** No se pudo determinar el resultado (red caída). NO reintentar a ciegas: consultar el hash. */
export class StellarUncertainResultError extends Error {
  constructor(
    readonly txHash: string,
    readonly cause?: unknown,
  ) {
    super(`No se pudo confirmar el resultado de la transacción ${txHash}`);
    this.name = 'StellarUncertainResultError';
  }
}
