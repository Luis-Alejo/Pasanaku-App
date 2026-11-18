import { Inject, Injectable } from '@nestjs/common';
import { Account, rpc } from '@stellar/stellar-sdk';
import { STELLAR_RPC } from './stellar.tokens.js';
import { TransactionLockService } from './transaction-lock.service.js';

/**
 * Serializa el uso del sequence number de cada cuenta (por publicKey), también entre
 * varias instancias del backend. Dentro del bloqueo se lee el sequence FRESCO de la red
 * y no se suelta el lock hasta que la transacción queda confirmada (o definitivamente
 * descartada), así que nunca hay dos transacciones de la misma cuenta compitiendo
 * por el mismo sequence (tx_bad_seq).
 *
 * Costo: las transacciones de una misma cuenta se confirman de una en una (~1 por ledger).
 * La cuenta admin es la más expuesta; para mucho volumen haría falta un pool de cuentas.
 */
@Injectable()
export class SequenceManagerService {
  constructor(
    private readonly locks: TransactionLockService,
    @Inject(STELLAR_RPC) private readonly server: rpc.Server,
  ) {}

  /** `fn` recibe un cargador de la cuenta con el sequence actual (llamarlo antes de cada build). */
  withAccount<T>(
    publicKey: string,
    fn: (loadAccount: () => Promise<Account>) => Promise<T>,
  ): Promise<T> {
    return this.locks.runExclusive(publicKey, () =>
      fn(() => this.server.getAccount(publicKey)),
    );
  }

  /** Exclusión por cuenta sin leer el sequence (p. ej. cuentas que todavía no existen). */
  exclusive<T>(publicKey: string, fn: () => Promise<T>): Promise<T> {
    return this.locks.runExclusive(publicKey, fn);
  }
}
