import { Injectable } from '@nestjs/common';
import { DataSource } from 'typeorm';

/**
 * Lock de Postgres (advisory) para que solo UNA instancia del backend ejecute cada tarea,
 * aunque haya varias apuntando a la misma BD. Complementa el flag en memoria de cada tarea.
 */
@Injectable()
export class ClusterLockService {
  constructor(private readonly dataSource: DataSource) {}

  /** Devuelve false si otra instancia ya tiene el lock (no ejecuta `fn`). */
  async run(key: number, fn: () => Promise<void>): Promise<boolean> {
    const qr = this.dataSource.createQueryRunner();
    await qr.connect();
    try {
      const [row] = await qr.query(
        'SELECT pg_try_advisory_lock($1) AS locked',
        [key],
      );
      if (!row?.locked) return false;
      try {
        await fn();
      } finally {
        await qr.query('SELECT pg_advisory_unlock($1)', [key]);
      }
      return true;
    } finally {
      await qr.release();
    }
  }
}
