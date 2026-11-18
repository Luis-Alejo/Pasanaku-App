import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { rpc, scValToNative } from '@stellar/stellar-sdk';
import { DataSource } from 'typeorm';
import { EnvVars } from '../../config/env.validation.js';
import { asAddress, asAmount, asU32 } from '../soroban/soroban-codec.js';
import { ProcessedSorobanEvent } from '../entities/processed-soroban-event.entity.js';
import {
  SOROBAN_EVENT,
  SorobanEventBase,
  SorobanEventName,
  SorobanEventPayloads,
} from './soroban-event.types.js';

type ParsedEvent = {
  name: SorobanEventName;
  topicName: string;
  payload: Omit<SorobanEventPayloads[SorobanEventName], keyof SorobanEventBase>;
};

/** "default_recorded" y "DefaultRecorded" -> "defaultrecorded" (tolera ambos formatos de topic). */
const normalize = (value: unknown) =>
  String(value).replace(/_/g, '').toLowerCase();

/**
 * Decodifica un evento y lo procesa UNA sola vez: en una transacción de BD registra el
 * eventId en processed_soroban_events (ON CONFLICT DO NOTHING) y, solo si era nuevo,
 * emite el evento interno esperando a los listeners. Si un listener falla, la transacción
 * se revierte (el evento queda sin marcar) y el indexador lo reintentará.
 */
@Injectable()
export class EventProcessorService {
  private readonly logger = new Logger(EventProcessorService.name);
  private readonly registryId: string;

  constructor(
    config: ConfigService<EnvVars, true>,
    private readonly dataSource: DataSource,
    private readonly emitter: EventEmitter2,
  ) {
    this.registryId = config.get('REPUTATION_REGISTRY_ID', { infer: true });
  }

  /** @returns true si el evento era nuevo y se emitió; false si ya estaba procesado o se ignora. */
  async process(event: rpc.Api.EventResponse): Promise<boolean> {
    const contractId = event.contractId?.toString() ?? '';
    const parsed = this.parse(event, contractId);
    if (!parsed) return false;

    return this.dataSource.transaction(async (manager) => {
      const inserted = await manager
        .createQueryBuilder()
        .insert()
        .into(ProcessedSorobanEvent)
        .values({
          eventId: event.id,
          contractAddress: contractId,
          ledger: event.ledger,
          topic: parsed.topicName,
        })
        .orIgnore()
        .returning('id')
        .execute();

      if (inserted.raw.length === 0) return false; // ya procesado

      await this.emitter.emitAsync(parsed.name, {
        ...parsed.payload,
        eventId: event.id,
        contractId,
        ledger: event.ledger,
        ledgerClosedAt: new Date(event.ledgerClosedAt),
        txHash: event.txHash,
        manager,
      });
      return true;
    });
  }

  // ------------------------------------------------------------------ decodificación

  private parse(
    event: rpc.Api.EventResponse,
    contractId: string,
  ): ParsedEvent | null {
    if (event.inSuccessfulContractCall === false) return null;

    const topics = event.topic.map((topic) => scValToNative(topic) as unknown);
    if (topics.length === 0) return null;
    const topicName = String(topics[0]);
    const value = scValToNative(event.value) as unknown;
    const name = normalize(topicName);

    try {
      return contractId === this.registryId
        ? this.parseRegistryEvent(name, topicName, topics, value)
        : this.parseGroupEvent(name, topicName, topics, value);
    } catch (error) {
      // Mejor fallar fuerte que descartar en silencio: el indexador se detiene y se investiga
      throw new Error(
        `Evento ${event.id} (${topicName}) con formato inesperado: ${(error as Error).message}`,
      );
    }
  }

  /**
   * Eventos de PasanakuContract. Ojo con el orden de topics, que NO es uniforme:
   *   joined   (user)            data: garantía     started   ()                 data: u32 participantes
   *   paid     (round, user)     data: cuota        slashed   (user, round)      data: cuota
   *   payout   (round, benef.)   data: pozo         no_ben    (round)            data: pozo acumulado
   *   final_pay(round, benef.)   data: monto        completed ()                 data: u32 ronda final
   *   arrears  (debtor, round)   data: monto
   */
  private parseGroupEvent(
    name: string,
    topicName: string,
    t: unknown[],
    value: unknown,
  ): ParsedEvent | null {
    switch (name) {
      case 'joined':
        return this.ok(SOROBAN_EVENT.GROUP_JOINED, topicName, {
          user: asAddress(t[1], 'user'),
          guaranteeAmount: asAmount(value, 'guarantee'),
        });
      case 'started':
        return this.ok(SOROBAN_EVENT.GROUP_STARTED, topicName, {
          participants: asU32(value, 'participants'),
        });
      case 'paid':
        return this.ok(SOROBAN_EVENT.ROUND_PAID, topicName, {
          round: asU32(t[1], 'round'),
          user: asAddress(t[2], 'user'),
          amount: asAmount(value, 'amount'),
        });
      case 'slashed':
        return this.ok(SOROBAN_EVENT.GUARANTEE_SLASHED, topicName, {
          user: asAddress(t[1], 'user'),
          round: asU32(t[2], 'round'),
          amount: asAmount(value, 'amount'),
        });
      case 'payout':
        return this.ok(SOROBAN_EVENT.ROUND_PAYOUT, topicName, {
          round: asU32(t[1], 'round'),
          beneficiary: asAddress(t[2], 'beneficiary'),
          amount: asAmount(value, 'amount'),
        });
      case 'noben':
        return this.ok(SOROBAN_EVENT.NO_BENEFICIARY, topicName, {
          round: asU32(t[1], 'round'),
          pool: asAmount(value, 'pool'),
        });
      case 'finalpay':
        return this.ok(SOROBAN_EVENT.FINAL_PAYOUT, topicName, {
          round: asU32(t[1], 'round'),
          beneficiary: asAddress(t[2], 'beneficiary'),
          amount: asAmount(value, 'amount'),
        });
      case 'completed':
        return this.ok(SOROBAN_EVENT.GROUP_COMPLETED, topicName, {
          lastRound: asU32(value, 'round'),
        });
      case 'arrears':
        return this.ok(SOROBAN_EVENT.ARREARS_PAID, topicName, {
          debtor: asAddress(t[1], 'debtor'),
          round: asU32(t[2], 'round'),
          amount: asAmount(value, 'amount'),
        });
      case 'defaulted':
        return this.ok(SOROBAN_EVENT.GUARANTEE_DEFAULTED, topicName, {
          user: asAddress(t[1], 'user'),
          round: asU32(t[2], 'round'),
        });
      case 'exempt':
        return this.ok(SOROBAN_EVENT.MEMBER_EXEMPT, topicName, {
          user: asAddress(t[1], 'user'),
          round: asU32(t[2], 'round'),
        });
      case 'debt': {
        const [beneficiary, amount] = value as unknown[];
        return this.ok(SOROBAN_EVENT.DEBT_RECORDED, topicName, {
          debtor: asAddress(t[1], 'debtor'),
          round: asU32(t[2], 'round'),
          beneficiary: asAddress(beneficiary, 'beneficiary'),
          amount: asAmount(amount, 'amount'),
        });
      }
      default:
        return null; // eventos ajenos o de tokens: se ignoran
    }
  }

  /**
   * Eventos de ReputationRegistry (#[contractevent]): topics [nombre, user]; los campos sin
   * #[topic] viajan en `data` como mapa {penalty, score} / {score}.
   */
  private parseRegistryEvent(
    name: string,
    topicName: string,
    t: unknown[],
    value: unknown,
  ): ParsedEvent | null {
    const data = (
      typeof value === 'object' && value !== null ? value : {}
    ) as Record<string, unknown>;
    switch (name) {
      case 'defaultrecorded':
        return this.ok(SOROBAN_EVENT.DEFAULT_RECORDED, topicName, {
          user: asAddress(t[1], 'user'),
          penalty: asU32(data.penalty, 'penalty'),
          score: asU32(data.score, 'score'),
        });
      case 'completionrewarded':
        return this.ok(SOROBAN_EVENT.COMPLETION_REWARDED, topicName, {
          user: asAddress(t[1], 'user'),
          score: asU32(data.score, 'score'),
        });
      default:
        return null;
    }
  }

  private ok(
    name: SorobanEventName,
    topicName: string,
    payload: object,
  ): ParsedEvent {
    return { name, topicName, payload: payload as ParsedEvent['payload'] };
  }
}
