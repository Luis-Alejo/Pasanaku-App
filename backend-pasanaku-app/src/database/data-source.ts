import 'dotenv/config';
import { join } from 'node:path';
import { DataSource } from 'typeorm';

/**
 * CLI de TypeORM (migrations).
 */
if (!process.env.DATABASE_URL) {
  throw new Error('DATABASE_URL es obligatoria para la CLI de TypeORM');
}

export default new DataSource({
  type: 'postgres',
  url: process.env.DATABASE_URL,
  ssl:
    process.env.DATABASE_SSL === 'true' ? { rejectUnauthorized: false } : false,
  entities: [join(import.meta.dirname, '..', '**', '*.entity.{ts,js}')],
  migrations: [join(import.meta.dirname, 'migrations', '*.{ts,js}')],
  synchronize: false,
});
