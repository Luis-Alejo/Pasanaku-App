/**
 * Puerto hacia groups/: lista los contratos de grupo que el indexador debe vigilar
 * (los de todos los grupos con contrato desplegado, incluidos los COMPLETED: pay_arrears
 * sigue emitiendo eventos). El registry se vigila siempre, sin pasar por aquí.
 * groups/ lo implementa en un módulo @Global(). Es opcional: sin él solo se indexa el registry.
 */
export const WATCHED_CONTRACTS_PORT = Symbol('WATCHED_CONTRACTS_PORT');

export interface WatchedContractsPort {
  getGroupContractIds(): Promise<string[]>;
}
