import { join } from 'node:path';
import { Module } from '@nestjs/common';
import { createObserveModule } from '@nestjs/observe';
import { ScheduleModule } from '@nestjs/schedule';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { GraphQLModule } from '@nestjs/graphql';
import { ApolloDriver, ApolloDriverConfig } from '@nestjs/apollo';
import { AppController } from './app.controller.js';
import { AppService } from './app.service.js';
import { BlockchainModule } from './blockchain/blockchain.module.js';
import { GroupsModule } from './groups/groups.module.js';
import { AppConfigModule } from './config/app-config.module.js';
import { DatabaseModule } from './database/database.module.js';
import { AuthModule } from './auth/auth.module.js';
import { UsersModule } from './users/users.module.js';
import { CryptoModule } from './common/crypto/index.js';
import { NotificationsModule } from './notifications/notifications.module.js';
import { TransactionsModule } from './transactions/transactions.module.js';

export const { ObserveModule, ObserveInstrument } = createObserveModule();

@Module({
  imports: [
    // Distributed tracing, auto-correlated logs, request/job metrics, error
    // telemetry, alarms, and more — out of the box. Sign up at https://observe.nestjs.com,
    // then run `npx @nestjs/observe link` to write your key pair into .env.
    ObserveModule.forRoot({
      appKey: process.env.OBSERVE_APP_KEY ?? 'YOUR_APP_KEY',
      appSecret: process.env.OBSERVE_APP_SECRET ?? 'YOUR_APP_SECRET',
      serviceId: 'backend-pasanaku-app',
    }),
    AppConfigModule,
    DatabaseModule,
    CryptoModule,
    NotificationsModule,
    TransactionsModule,
    ScheduleModule.forRoot(),
    EventEmitterModule.forRoot(),
    GraphQLModule.forRoot<ApolloDriverConfig>({
      driver: ApolloDriver,
      autoSchemaFile: join(process.cwd(), 'src/schema.gql'),
      sortSchema: true,
      playground: process.env.NODE_ENV !== 'production',
      context: ({ req }: { req: unknown }) => ({ req }),
    }),
    AuthModule,
    UsersModule,
    BlockchainModule,
    GroupsModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
