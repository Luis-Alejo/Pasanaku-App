import { Inject, Injectable, Logger, Optional } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Interval } from '@nestjs/schedule';
import { InjectRepository } from '@nestjs/typeorm';
import { rpc } from '@stellar/stellar-sdk';
import { Repository } from 'typeorm';
import { EnvVars } from '../../config/env.validation.js';
import { SorobanEventCursor } from '../entities/soroban-event-cursor.entity.js';
import { STELLAR_RPC } from '../stellar/stellar.tokens.js';
import { TransactionLockService } from '../stellar/transaction-lock.service.js';
import { EventProcessorService } from './event-processor.service.js';
import {
  WATCHED_CONTRACTS_PORT,
  type WatchedContractsPort,
} from './watched-contracts.port.js';

export const INDEXER_CURSOR_ID = 'pasanaku_events';

const POLL_INTERVAL_MS = 5_000;
const MAX_LEDGERS_PER_POLL = 2_000;
/** Se re-lee un poco hacia atrás; es inocuo porque el procesamiento es idempotente. */
const OVERLAP_LEDGERS = 10;
const PAGE_LIMIT = 200;
// Límites de getEvents: hasta 5 filtros por petición y 5 contratos por filtro
const CONTRACTS_PER_FILTER = 5;
const FILTERS_PER_REQUEST = 5;

function chunk<T>(items: T[], size: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < items.length; i += size)
    out.push(items.slice(i, i + size));
  return out;
}

/**
 * Lee periódicamente los eventos de los contratos vigilados desde `SorobanEventCursor.lastLedger`
 * y los entrega en orden a EventProcessorService. El cursor solo avanza cuando TODO el rango
 * se procesó; si algo falla se reintenta el mismo rango en el siguiente ciclo.
 * Requiere ScheduleModule.forRoot() en el AppModule.
 */
@Injectable()
export class SorobanIndexerService {
  private readonly logger = new Logger(SorobanIndexerService.name);
  private readonly registryId: string;
  private running = false;

  constructor(
    config: ConfigService<EnvVars, true>,
    @Inject(STELLAR_RPC) private readonly server: rpc.Server,
    @InjectRepository(SorobanEventCursor)
    private readonly cursors: Repository<SorobanEventCursor>,
    private readonly processor: EventProcessorService,
    private readonly locks: TransactionLockService,
    @Optional()
    @Inject(WATCHED_CONTRACTS_PORT)
    private readonly watched?: WatchedContractsPort,
  ) {
    this.registryId = config.get('REPUTATION_REGISTRY_ID', { infer: true });
  }

  @Interval('soroban-indexer', POLL_INTERVAL_MS)
  async poll(): Promise<void> {
    if (this.running) return; // un ciclo a la vez por instancia
    this.running = true;
    try {
      // Y uno a la vez entre instancias (advisory lock)
      const outcome = await this.locks.tryRunExclusive(
        `indexer:${INDEXER_CURSOR_ID}`,
        () => this.indexOnce(),
      );
      if (!outcome.acquired) this.logger.debug('Otra instancia está indexando');
    } catch (error) {
      this.logger.error(
        `Fallo del indexador (se reintentará): ${(error as Error).message}`,
      );
    } finally {
      this.running = false;
    }
  }

  private async indexOnce(): Promise<void> {
    const health = await this.server.getHealth();
    const cursor =
      (await this.cursors.findOneBy({ id: INDEXER_CURSOR_ID })) ??
      this.cursors.create({
        id: INDEXER_CURSOR_ID,
        lastLedger: 0,
        pagingToken: null,
      });

    if (cursor.lastLedger > 0 && cursor.lastLedger + 1 < health.oldestLedger) {
      this.logger.warn(
        `El RPC ya no conserva los ledgers ${cursor.lastLedger + 1}-${health.oldestLedger - 1}: ` +
          'hay eventos perdidos; reconcilia con las lecturas on-chain (getConfig/getMember).',
      );
    }

    const start = Math.max(
      cursor.lastLedger + 1 - OVERLAP_LEDGERS,
      health.oldestLedger,
      1,
    );
    if (start > health.latestLedger) return;
    const end = Math.min(health.latestLedger, start + MAX_LEDGERS_PER_POLL - 1);

    const contractIds = await this.contractsToWatch();
    const events: rpc.Api.EventResponse[] = [];
    for (const batch of chunk(
      contractIds,
      CONTRACTS_PER_FILTER * FILTERS_PER_REQUEST,
    )) {
      events.push(
        ...(await this.fetchEvents(batch, start, end, health.latestLedger)),
      );
    }
    // Los IDs de evento son ordenables lexicográficamente (ledger-tx-op-evento)
    events.sort((a, b) => (a.id < b.id ? -1 : a.id > b.id ? 1 : 0));

    let processed = 0;
    for (const event of events) {
      if (await this.processor.process(event)) processed++;
    }

    cursor.lastLedger = Math.max(cursor.lastLedger, end);
    cursor.pagingToken =
      events.length > 0 ? events[events.length - 1].id : cursor.pagingToken;
    await this.cursors.save(cursor);

    if (processed > 0) {
      this.logger.log(
        `Ledgers ${start}-${end}: ${processed} evento(s) nuevo(s) de ${events.length} leído(s)`,
      );
    }
  }

  private async contractsToWatch(): Promise<string[]> {
    const groups = (await this.watched?.getGroupContractIds()) ?? [];
    return [...new Set([this.registryId, ...groups])];
  }

  private async fetchEvents(
    contractIds: string[],
    startLedger: number,
    endLedger: number,
    latestLedger: number,
  ): Promise<rpc.Api.EventResponse[]> {
    const filters: rpc.Api.EventFilter[] = chunk(
      contractIds,
      CONTRACTS_PER_FILTER,
    ).map((ids) => ({
      type: 'contract',
      contractIds: ids,
    }));

    // endLedger es exclusivo; si llegamos al último ledger, se omite
    let response = await this.server.getEvents({
      startLedger,
      ...(endLedger < latestLedger ? { endLedger: endLedger + 1 } : {}),
      filters,
      limit: PAGE_LIMIT,
    });
    const events = [...response.events];

    while (response.events.length >= PAGE_LIMIT) {
      response = await this.server.getEvents({
        cursor: response.cursor,
        filters,
        limit: PAGE_LIMIT,
      });
      events.push(...response.events);
    }
    return events;
  }
}
