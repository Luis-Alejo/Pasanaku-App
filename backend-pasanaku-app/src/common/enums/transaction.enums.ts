import { registerEnumType } from '@nestjs/graphql';

export enum TransactionType {
  GUARANTEE_DEPOSIT = 'GUARANTEE_DEPOSIT',
  ROUND_PAYMENT = 'ROUND_PAYMENT',
  ARREARS_PAYMENT = 'ARREARS_PAYMENT',
  PAYOUT = 'PAYOUT',
  GUARANTEE_REFUND = 'GUARANTEE_REFUND',
  PENALTY_SLASH = 'PENALTY_SLASH',
  DEPOSIT = 'DEPOSIT',
}

export enum TransactionStatus {
  PENDING_FIAT = 'PENDING_FIAT',
  PENDING_CHAIN = 'PENDING_CHAIN',
  CONFIRMED = 'CONFIRMED',
  FAILED = 'FAILED',
}

export enum Currency {
  BOB = 'BOB',
}

registerEnumType(TransactionType, { name: 'TransactionType' });
registerEnumType(TransactionStatus, { name: 'TransactionStatus' });
registerEnumType(Currency, { name: 'Currency' });
