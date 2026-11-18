import { Injectable } from '@nestjs/common';
import { DataSource } from 'typeorm';

export type LockResult<T> = { acquired: true; result: T } | { acquired: false };

/**
 * Bloqueos compartidos entre instancias del backend con advisory locks de PostgreSQL.
 * pg_advisory_xact_lock vive lo que dura la transacción de BD, así que `fn` se ejecuta
 * DENTRO de una transacción abierta (ocupa una conexión del pool mientras corre).
 * No anidar el mismo `key` (la segunda conexión esperaría a la primera hasta el timeout).
 */
@Injectable()
export class TransactionLockService {
  constructor(private readonly dataSource: DataSource) {}

  /** Espera el lock (hasta `timeoutMs`) y ejecuta `fn` en exclusiva. */
  async runExclusive<T>(
    key: string,
    fn: () => Promise<T>,
    timeoutMs = 90_000,
  ): Promise<T> {
    const runner = this.dataSource.createQueryRunner();
    await runner.connect();
    try {
      await runner.startTransaction();
      await runner.query(`SET LOCAL lock_timeout = ${Math.trunc(timeoutMs)}`);
      await runner.query(
        'SELECT pg_advisory_xact_lock(hashtextextended($1, 0))',
        [`stellar:${key}`],
      );
      const result = await fn();
      await runner.commitTransaction();
      return result;
    } catch (error) {
      if (runner.isTransactionActive) {
        await runner.rollbackTransaction().catch(() => undefined);
      }
      throw error;
    } finally {
      await runner.release();
    }
  }

  /** Igual, pero sin esperar: si otra instancia tiene el lock, devuelve { acquired: false }. */
  async tryRunExclusive<T>(
    key: string,
    fn: () => Promise<T>,
  ): Promise<LockResult<T>> {
    const runner = this.dataSource.createQueryRunner();
    await runner.connect();
    try {
      await runner.startTransaction();
      const rows: Array<{ locked: boolean }> = await runner.query(
        'SELECT pg_try_advisory_xact_lock(hashtextextended($1, 0)) AS locked',
        [`stellar:${key}`],
      );
      if (!rows[0]?.locked) {
        await runner.rollbackTransaction();
        return { acquired: false };
      }
      const result = await fn();
      await runner.commitTransaction();
      return { acquired: true, result };
    } catch (error) {
      if (runner.isTransactionActive) {
        await runner.rollbackTransaction().catch(() => undefined);
      }
      throw error;
    } finally {
      await runner.release();
    }
  }
}
