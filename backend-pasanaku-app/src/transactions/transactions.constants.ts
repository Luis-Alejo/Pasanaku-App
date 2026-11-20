import { TransactionStatus, TransactionType } from '../common/enums/index.js';

export const TX_TYPE = {
  DEPOSIT: TransactionType.DEPOSIT, // BOB -> USDC en la wallet (Pollar)
  GROUP_JOIN: TransactionType.GUARANTEE_DEPOSIT, // garantía al unirse
  ROUND_CONTRIBUTION: TransactionType.ROUND_PAYMENT, // cuota de ronda
  ARREARS_PAYMENT: TransactionType.ARREARS_PAYMENT, // pago de deuda
  PAYOUT: TransactionType.PAYOUT, // pozo recibido
} as const;

export const TX_STATUS = {
  PENDING_FIAT: TransactionStatus.PENDING_FIAT, // QR emitido, esperando el pago en BOB
  CHAIN_SUBMITTED: TransactionStatus.PENDING_CHAIN, // pago fiat confirmado; acreditando USDC
  CONFIRMED: TransactionStatus.CONFIRMED,
  FAILED: TransactionStatus.FAILED,
} as const;
