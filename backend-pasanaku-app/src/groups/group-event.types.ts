import { EntityManager } from 'typeorm';

/**
 * Nombres de eventos internos emitidos por el indexador (blockchain/indexer).
 * defaulted / exempt / debt son los eventos NUEVOS del contrato (decisión 1):
 * el codec del indexador debe emitirlos con estos nombres.
 */
export const GROUP_EVENT = {
  JOINED: 'soroban.group.joined',
  STARTED: 'soroban.group.started',
  PAID: 'soroban.group.paid',
  SLASHED: 'soroban.group.slashed',
  DEFAULTED: 'soroban.group.defaulted',
  EXEMPT: 'soroban.group.exempt',
  DEBT: 'soroban.group.debt',
  PAYOUT: 'soroban.group.payout',
  NO_BENEFICIARY: 'soroban.group.no_beneficiary',
  FINAL_PAY: 'soroban.group.final_pay',
  COMPLETED: 'soroban.group.completed',
  ARREARS: 'soroban.group.arrears',
} as const;

export interface BaseGroupEvent {
  eventId: string;
  contractId: string;
  ledger: number;
  ledgerClosedAt: Date;
  txHash: string;
  manager: EntityManager;
}

// Montos en stroops (string); `user`, `debtor`, `beneficiary` son claves públicas Stellar.
export interface GroupJoinedEvent extends BaseGroupEvent {
  user: string;
  guaranteeAmount: string;
}
export interface GroupStartedEvent extends BaseGroupEvent {
  participants: number;
}
export interface GroupPaidEvent extends BaseGroupEvent {
  round: number;
  user: string;
  amount: string;
}
export interface GroupSlashedEvent extends BaseGroupEvent {
  user: string;
  round: number;
  amount: string;
}
export interface GroupDefaultedEvent extends BaseGroupEvent {
  user: string;
  round: number;
}
export interface GroupExemptEvent extends BaseGroupEvent {
  user: string;
  round: number;
}
export interface GroupDebtEvent extends BaseGroupEvent {
  debtor: string;
  round: number;
  beneficiary: string;
  amount: string;
}
export interface GroupPayoutEvent extends BaseGroupEvent {
  round: number;
  beneficiary: string;
  amount: string;
}
export interface GroupNoBeneficiaryEvent extends BaseGroupEvent {
  round: number;
  pool: string;
}
export interface GroupFinalPayEvent extends BaseGroupEvent {
  round: number;
  beneficiary: string;
  amount: string;
}
export interface GroupCompletedEvent extends BaseGroupEvent {
  lastRound: number;
}
export interface GroupArrearsEvent extends BaseGroupEvent {
  debtor: string;
  round: number;
  amount: string;
}
