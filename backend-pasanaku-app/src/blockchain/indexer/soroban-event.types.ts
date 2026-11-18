import { EntityManager } from 'typeorm';

/**
 * Eventos internos (EventEmitter2) que emite el indexador. groups/ y users/ los escuchan para
 * actualizar sus proyecciones, sin depender de blockchain/ más que de estos tipos.
 *
 * IMPORTANTE para los listeners: cada payload trae `manager`, el EntityManager de la
 * transacción que también registra el evento como procesado. Escribe SIEMPRE con él, y
 * registra el handler con `@OnEvent(nombre, { suppressErrors: false })`; por defecto
 * @nestjs/event-emitter se traga los errores y el evento quedaría marcado como procesado
 * sin haberse aplicado.
 *
 *   @OnEvent(SOROBAN_EVENT.GROUP_JOINED, { suppressErrors: false })
 *   async onJoined(e: GroupJoinedEvent) { await e.manager.update(GroupMember, ...); }
 */
export const SOROBAN_EVENT = {
  // PasanakuContract (una instancia por grupo)
  GROUP_JOINED: 'soroban.group.joined',
  GROUP_STARTED: 'soroban.group.started',
  ROUND_PAID: 'soroban.group.paid',
  GUARANTEE_SLASHED: 'soroban.group.slashed',
  ROUND_PAYOUT: 'soroban.group.payout',
  NO_BENEFICIARY: 'soroban.group.no_beneficiary',
  FINAL_PAYOUT: 'soroban.group.final_pay',
  GROUP_COMPLETED: 'soroban.group.completed',
  ARREARS_PAID: 'soroban.group.arrears',
  // ReputationRegistry (contrato global)
  DEFAULT_RECORDED: 'soroban.registry.default_recorded',
  COMPLETION_REWARDED: 'soroban.registry.completion_rewarded',
  GUARANTEE_DEFAULTED: 'soroban.group.defaulted',
  MEMBER_EXEMPT: 'soroban.group.exempt',
  DEBT_RECORDED: 'soroban.group.debt',
} as const;

export interface SorobanEventBase {
  /** ID único del evento en Soroban RPC (clave de idempotencia). */
  eventId: string;
  /** Contrato que lo emitió: el grupo, o el registry. */
  contractId: string;
  ledger: number;
  ledgerClosedAt: Date;
  txHash: string;
  /** Transacción de BD abierta por el indexador; escribe con ella. */
  manager: EntityManager;
}

// Montos en stroops (string), rondas u32 (number), direcciones string.
export interface GroupJoinedEvent extends SorobanEventBase {
  user: string;
  guaranteeAmount: string;
}
export interface GroupStartedEvent extends SorobanEventBase {
  participants: number;
}
export interface RoundPaidEvent extends SorobanEventBase {
  round: number;
  user: string;
  amount: string;
}
export interface GuaranteeSlashedEvent extends SorobanEventBase {
  user: string;
  round: number;
  amount: string;
}
export interface RoundPayoutEvent extends SorobanEventBase {
  round: number;
  beneficiary: string;
  amount: string;
}
export interface NoBeneficiaryEvent extends SorobanEventBase {
  round: number;
  pool: string;
}
export interface FinalPayoutEvent extends SorobanEventBase {
  round: number;
  beneficiary: string;
  amount: string;
}
export interface GroupCompletedEvent extends SorobanEventBase {
  lastRound: number;
}
export interface ArrearsPaidEvent extends SorobanEventBase {
  debtor: string;
  round: number;
  amount: string;
}
export interface DefaultRecordedEvent extends SorobanEventBase {
  user: string;
  penalty: number;
  score: number;
}
export interface CompletionRewardedEvent extends SorobanEventBase {
  user: string;
  score: number;
}

export interface GuaranteeDefaultedEvent extends SorobanEventBase {
  user: string;
  round: number;
}

export interface MemberExemptEvent extends SorobanEventBase {
  user: string;
  round: number;
}

export interface DebtRecordedEvent extends SorobanEventBase {
  debtor: string;
  round: number;
  beneficiary: string;
  amount: string;
}

export interface SorobanEventPayloads {
  [SOROBAN_EVENT.GROUP_JOINED]: GroupJoinedEvent;
  [SOROBAN_EVENT.GROUP_STARTED]: GroupStartedEvent;
  [SOROBAN_EVENT.ROUND_PAID]: RoundPaidEvent;
  [SOROBAN_EVENT.GUARANTEE_SLASHED]: GuaranteeSlashedEvent;
  [SOROBAN_EVENT.ROUND_PAYOUT]: RoundPayoutEvent;
  [SOROBAN_EVENT.NO_BENEFICIARY]: NoBeneficiaryEvent;
  [SOROBAN_EVENT.FINAL_PAYOUT]: FinalPayoutEvent;
  [SOROBAN_EVENT.GROUP_COMPLETED]: GroupCompletedEvent;
  [SOROBAN_EVENT.ARREARS_PAID]: ArrearsPaidEvent;
  [SOROBAN_EVENT.DEFAULT_RECORDED]: DefaultRecordedEvent;
  [SOROBAN_EVENT.COMPLETION_REWARDED]: CompletionRewardedEvent;
  [SOROBAN_EVENT.GUARANTEE_DEFAULTED]: GuaranteeDefaultedEvent;
  [SOROBAN_EVENT.MEMBER_EXEMPT]: MemberExemptEvent;
  [SOROBAN_EVENT.DEBT_RECORDED]: DebtRecordedEvent;
}

export type SorobanEventName = keyof SorobanEventPayloads;
