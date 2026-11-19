import { Global, Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Horizon, rpc } from '@stellar/stellar-sdk';
import { EnvVars } from '../config/env.validation.js';
import { WALLET_KEY_GENERATOR } from '../users/ports/wallet-key-generator.port.js';
import { ProcessedSorobanEvent } from './entities/processed-soroban-event.entity.js';
import { SorobanEventCursor } from './entities/soroban-event-cursor.entity.js';
import { EventProcessorService } from './indexer/event-processor.service.js';
import { SorobanIndexerService } from './indexer/soroban-indexer.service.js';
import { SorobanInvokerService } from './soroban/soroban-invoker.service.js';
import { SorobanPasanakuService } from './soroban/soroban-pasanaku.service.js';
import { SorobanRegistryService } from './soroban/soroban-registry.service.js';
import { SequenceManagerService } from './stellar/sequence-manager.service.js';
import { StellarService } from './stellar/stellar.service.js';
import { STELLAR_HORIZON, STELLAR_RPC } from './stellar/stellar.tokens.js';
import { TransactionLockService } from './stellar/transaction-lock.service.js';

/**
 * Requiere en el AppModule: ScheduleModule.forRoot() y EventEmitterModule.forRoot().
 * Exporta solo lo público: StellarService (activación de wallets), los wrappers Soroban y el
 * puerto de wallets que consume UsersModule. Lock, sequence manager, invoker, indexador y
 * procesador quedan internos.
 */
@Global()
@Module({
  imports: [
    TypeOrmModule.forFeature([SorobanEventCursor, ProcessedSorobanEvent]),
  ],
  providers: [
    {
      provide: STELLAR_RPC,
      inject: [ConfigService],
      useFactory: (config: ConfigService<EnvVars, true>) => {
        const url = config.get('SOROBAN_RPC_URL', { infer: true });
        return new rpc.Server(url, { allowHttp: url.startsWith('http://') });
      },
    },
    {
      provide: STELLAR_HORIZON,
      inject: [ConfigService],
      useFactory: (config: ConfigService<EnvVars, true>) => {
        const url = config.get('STELLAR_HORIZON_URL', { infer: true });
        return new Horizon.Server(url, {
          allowHttp: url.startsWith('http://'),
        });
      },
    },
    TransactionLockService,
    SequenceManagerService,
    StellarService,
    { provide: WALLET_KEY_GENERATOR, useExisting: StellarService },
    SorobanInvokerService,
    SorobanRegistryService,
    SorobanPasanakuService,
    EventProcessorService,
    SorobanIndexerService,
  ],
  exports: [
    StellarService,
    SorobanRegistryService,
    SorobanPasanakuService,
    WALLET_KEY_GENERATOR,
  ],
})
export class BlockchainModule {}
