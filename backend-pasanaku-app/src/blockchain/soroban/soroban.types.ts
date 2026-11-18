/** Tipos de alto nivel de los contratos. i128/u64 -> string; u32 -> number; Address -> string. */

export type ContractGroupStatus = 'Open' | 'Active' | 'Completed';

/** `GroupConfig` del contrato Pasanaku. */
export interface GroupConfigView {
  admin: string;
  token: string;
  registry: string;
  contribution: string; // i128, stroops
  guarantee: string; // i128, stroops
  roundDuration: string; // u64, segundos
  maxParticipants: number; // u32
  isPublic: boolean;
  currentRound: number; // u32
  deadline: string; // u64, timestamp UNIX (segundos)
  roundPool: string; // i128, stroops
  noBeneficiaryRounds: number; // u32
  status: ContractGroupStatus;
  graceSeconds: string;
}

/** `MemberState` del contrato Pasanaku. */
export interface MemberStateView {
  guaranteeBalance: string; // i128
  totalContributed: string; // i128
  clean: boolean;
  joined: boolean;
}

export interface TxReceipt {
  txHash: string;
  ledger: number;
}

export interface SettleRoundResult extends TxReceipt {
  /** Beneficiario del pozo; null si la ronda quedó sin beneficiario elegible (`no_ben`). */
  beneficiary: string | null;
}

export interface DeployGroupParams {
  /** Cuota por ronda en stroops. La garantía es igual a la cuota (el contrato lo exige). */
  contribution: string;
  /** Duración de cada ronda en segundos. */
  roundDurationSeconds: number | string;
  /** 2 a 20 participantes. */
  maxParticipants: number;
  isPublic: boolean;
  graceSeconds: number;
}

export interface DeployGroupResult {
  contractId: string;
  deployTxHash: string;
  initTxHash: string;
  authorizeRegistryTxHash: string;
}
