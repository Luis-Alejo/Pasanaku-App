import { environment } from '@env/environment';

/** Enlace a una transacción en el explorador de Stellar Testnet (configurable en environments). */
export function explorerTxUrl(txHash: string): string {
  return `${environment.stellar.explorerTxUrl}${encodeURIComponent(txHash)}`;
}

/** Hash abreviado para mostrar: "3ed60a…b8083c". */
export function shortHash(txHash: string, chars = 6): string {
  return txHash.length <= chars * 2 + 1 ? txHash : `${txHash.slice(0, chars)}…${txHash.slice(-chars)}`;
}
