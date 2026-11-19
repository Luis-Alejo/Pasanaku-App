/**
 * Puerto hacia blockchain/: users/ no importa @stellar/stellar-sdk.
 * blockchain/ debe proveer una implementación con este token (módulo @Global()).
 */
export const WALLET_KEY_GENERATOR = Symbol('WALLET_KEY_GENERATOR');

export interface GeneratedKeypair {
  /** Clave pública Stellar (G...) */
  publicKey: string;
  /** Semilla secreta Stellar (S...) */
  secret: string;
}

export interface WalletKeyGenerator {
  generateKeypair(): GeneratedKeypair | Promise<GeneratedKeypair>;
}
