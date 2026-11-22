import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { EnvVars } from '../../config/env.validation.js';
import { StellarService } from '../stellar/stellar.service.js';
import {
  asBool,
  asU32,
  nativeOf,
  toAddress,
  toBool,
  toU32,
} from './soroban-codec.js';
import { SorobanInvokerService } from './soroban-invoker.service.js';
import { TxReceipt } from './soroban.types.js';

/**
 * Wrapper tipado de `ReputationRegistry`.
 * `record_default` y `reward_completion` NO se exponen: solo pueden invocarlas los
 * contratos de grupo autorizados (el backend nunca debe llamarlas).
 * Errores posibles: SorobanContractError con RegistryErrorCode.
 */
@Injectable()
export class SorobanRegistryService {
  private readonly registryId: string;

  constructor(
    config: ConfigService<EnvVars, true>,
    private readonly invoker: SorobanInvokerService,
    private readonly stellar: StellarService,
  ) {
    this.registryId = config.get('REPUTATION_REGISTRY_ID', { infer: true });
  }

  /** set_group(caller, group, allowed): autoriza/revoca un contrato de grupo. Firma el admin. */
  async setGroup(
    groupContractId: string,
    allowed: boolean,
  ): Promise<TxReceipt> {
    const admin = this.stellar.resolveSigner();
    const result = await this.invoker.invoke(
      'registry',
      this.registryId,
      'set_group',
      [
        toAddress(admin.publicKey()),
        toAddress(groupContractId),
        toBool(allowed),
      ],
      admin,
    );
    return { txHash: result.txHash, ledger: result.ledger };
  }

  /** get_score(user) -> u32 (100 si nunca ha tenido movimientos). */
  async getScore(user: string): Promise<number> {
    const value = await this.invoker.read(
      'registry',
      this.registryId,
      'get_score',
      [toAddress(user)],
    );
    return asU32(nativeOf(value), 'get_score');
  }

  /** can_join_public(user) -> bool (false si el puntaje es menor a 40). */
  async canJoinPublic(user: string): Promise<boolean> {
    const value = await this.invoker.read(
      'registry',
      this.registryId,
      'can_join_public',
      [toAddress(user)],
    );
    return asBool(nativeOf(value), 'can_join_public');
  }

  /** can_take_early_turn(user, turn_number, total_turns) -> bool. `turnNumber` es 1-based. */
  async canTakeEarlyTurn(
    user: string,
    turnNumber: number,
    totalTurns: number,
  ): Promise<boolean> {
    const value = await this.invoker.read(
      'registry',
      this.registryId,
      'can_take_early_turn',
      [toAddress(user), toU32(turnNumber), toU32(totalTurns)],
    );
    return asBool(nativeOf(value), 'can_take_early_turn');
  }
}
