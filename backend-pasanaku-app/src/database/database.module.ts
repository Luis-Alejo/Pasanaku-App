import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { join } from 'node:path';
import { EnvVars } from '../config/env.validation.js';

@Module({
  imports: [
    TypeOrmModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService<EnvVars, true>) => {
        const isProd = config.get('NODE_ENV', { infer: true }) === 'production';
        const useSsl = config.get('DATABASE_SSL', { infer: true });

        return {
          type: 'postgres' as const,
          url: config.get('DATABASE_URL', { infer: true }),
          ssl: useSsl ? { rejectUnauthorized: false } : false,
          autoLoadEntities: true,
          synchronize: false,
          migrations: [join(import.meta.dirname, 'migrations', '*.{ts,js}')],
          migrationsRun: false,
          logging: isProd
            ? ['error' as const]
            : ['error' as const, 'warn' as const],
          retryAttempts: 5,
          retryDelay: 3000,
        };
      },
    }),
  ],
  exports: [TypeOrmModule],
})
export class DatabaseModule {}
