import { Injectable } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import type { TransactionType } from '../common/enums/index.js';
import {
  SOROBAN_EVENT,
  type ArrearsPaidEvent,
  type FinalPayoutEvent,
  type GroupJoinedEvent,
  type RoundPaidEvent,
  type RoundPayoutEvent,
  type SorobanEventBase,
} from '../blockchain/indexer/soroban-event.types.js';
import { PasanakuGroup } from '../groups/entities/pasanaku-group.entity.js';
import { Round } from '../groups/entities/round.entity.js';
import { User } from '../users/entities/user.entity.js';
import { TX_TYPE } from './transactions.constants.js';
import { TransactionsService } from './transactions.service.js';

const OPTS = { suppressErrors: false } as const;

/**
 * Historial financiero a partir de eventos on-chain (misma transacción de BD que el indexador).
 * No registra `slashed`: comparte tx con `payout` (hash único) y no es un movimiento nuevo del
 * usuario (consume una garantía ya depositada); queda visible en RoundPayment.status.
 */
@Injectable()
export class TransactionsEventsListener {
  constructor(private readonly transactions: TransactionsService) {}

  @OnEvent(SOROBAN_EVENT.GROUP_JOINED, OPTS)
  onJoined(e: GroupJoinedEvent) {
    return this.record(e, e.user, TX_TYPE.GROUP_JOIN, e.guaranteeAmount);
  }

  @OnEvent(SOROBAN_EVENT.ROUND_PAID, OPTS)
  onPaid(e: RoundPaidEvent) {
    return this.record(
      e,
      e.user,
      TX_TYPE.ROUND_CONTRIBUTION,
      e.amount,
      e.round,
    );
  }

  @OnEvent(SOROBAN_EVENT.ARREARS_PAID, OPTS)
  onArrears(e: ArrearsPaidEvent) {
    return this.record(e, e.debtor, TX_TYPE.ARREARS_PAYMENT, e.amount, e.round);
  }

  @OnEvent(SOROBAN_EVENT.ROUND_PAYOUT, OPTS)
  onPayout(e: RoundPayoutEvent) {
    return this.record(e, e.beneficiary, TX_TYPE.PAYOUT, e.amount, e.round);
  }

  @OnEvent(SOROBAN_EVENT.FINAL_PAYOUT, OPTS)
  onFinalPayout(e: FinalPayoutEvent) {
    return this.record(e, e.beneficiary, TX_TYPE.PAYOUT, e.amount, e.round);
  }

  private async record(
    e: SorobanEventBase,
    publicKey: string,
    type: TransactionType,
    amount: string,
    round?: number,
  ): Promise<void> {
    const m = e.manager;
    const user = await m.findOneBy(User, { stellarPublicKey: publicKey });
    const group = await m.findOneBy(PasanakuGroup, {
      contractAddress: e.contractId,
    });
    if (!user || !group) return; // evento ajeno a este backend
    const roundRow = round
      ? await m.findOneBy(Round, { groupId: group.id, roundNumber: round })
      : null;
    await this.transactions.recordChainTransaction(
      {
        idempotencyKey: `chain:${e.eventId}`,
        userId: user.id,
        groupId: group.id,
        roundId: roundRow?.id ?? null,
        type,
        amountStroops: amount,
        stellarTxHash: e.txHash,
        occurredAt: e.ledgerClosedAt,
      },
      m,
    );
  }
}
