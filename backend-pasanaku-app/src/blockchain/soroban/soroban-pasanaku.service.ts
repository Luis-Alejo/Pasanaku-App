import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { EnvVars } from '../../config/env.validation.js';
import { StellarService } from '../stellar/stellar.service.js';
import {
  asAddress,
  asAddressList,
  asAmount,
  asBool,
  asOptionAddress,
  asRecord,
  asU32,
  nativeOf,
  toAddress,
  toAddressVec,
  toBool,
  toI128,
  toU32,
  toU64,
} from './soroban-codec.js';
import { GroupDeploymentError } from './soroban-errors.js';
import { SorobanInvokerService } from './soroban-invoker.service.js';
import { SorobanRegistryService } from './soroban-registry.service.js';
import {
  ContractGroupStatus,
  DeployGroupParams,
  DeployGroupResult,
  GroupConfigView,
  MemberStateView,
  SettleRoundResult,
  TxReceipt,
} from './soroban.types.js';

const MIN_PARTICIPANTS = 2;
const MAX_PARTICIPANTS = 20; // MAX_PARTICIPANTS del contrato
const GROUP_STATUSES: ContractGroupStatus[] = ['Open', 'Active', 'Completed'];

/**
 * Wrapper tipado de `PasanakuContract` (una instancia por grupo).
 * Las operaciones del organizador las firma el admin del servidor; las del participante
 * reciben su semilla secreta ya descifrada por quien llama (nunca se guarda aquí).
 * Errores posibles: SorobanContractError con PasanakuErrorCode.
 */
@Injectable()
export class SorobanPasanakuService {
  private readonly tokenId: string;
  private readonly registryId: string;
  private readonly wasmHash: string;

  constructor(
    config: ConfigService<EnvVars, true>,
    private readonly invoker: SorobanInvokerService,
    private readonly registry: SorobanRegistryService,
    private readonly stellar: StellarService,
  ) {
    this.tokenId = config.get('USDC_CONTRACT_ID', { infer: true });
    this.registryId = config.get('REPUTATION_REGISTRY_ID', { infer: true });
    this.wasmHash = config.get('PASANAKU_WASM_HASH', { infer: true });
  }

  // ================================================================ escritura

  /**
   * 1) despliega desde PASANAKU_WASM_HASH, 2) `init` con el admin del servidor como organizador,
   * 3) autoriza el contrato en el registry. Sin el paso 3 `settle_round` revertiría en cuanto
   * hubiera un incumplimiento (record_default exige un grupo autorizado) y el grupo no
   * podría completarse (reward_completion).
   * Si `init` devuelve AlreadyInitialized alguien se adelantó: descartar ese contrato.
   */
  async deployGroupContract(
    params: DeployGroupParams,
  ): Promise<DeployGroupResult> {
    if (
      params.maxParticipants < MIN_PARTICIPANTS ||
      params.maxParticipants > MAX_PARTICIPANTS
    ) {
      throw new Error(
        `maxParticipants debe estar entre ${MIN_PARTICIPANTS} y ${MAX_PARTICIPANTS}`,
      );
    }

    const deployed = await this.invoker.createContract(this.wasmHash);
    const contractId = deployed.contractId;

    let initHash: string;
    try {
      initHash = (await this.initializeGroupContract(contractId, params))
        .txHash;
    } catch (error) {
      throw new GroupDeploymentError(contractId, 'init', error);
    }

    let authorizeHash: string;
    try {
      authorizeHash = (await this.registry.setGroup(contractId, true)).txHash;
    } catch (error) {
      throw new GroupDeploymentError(contractId, 'authorize_registry', error);
    }

    return {
      contractId,
      deployTxHash: deployed.txHash,
      initTxHash: initHash,
      authorizeRegistryTxHash: authorizeHash,
    };
  }

  /** invite_member(admin, user). Solo con el grupo Open. */
  async inviteMember(
    contractId: string,
    userPublicKey: string,
  ): Promise<TxReceipt> {
    const admin = this.stellar.resolveSigner();
    return this.write(
      contractId,
      'invite_member',
      [toAddress(admin.publicKey()), toAddress(userPublicKey)],
      admin,
    );
  }

  /** join_group(user): transfiere la garantía (1 cuota) desde la wallet del usuario. */
  async joinGroup(contractId: string, userSecret: string): Promise<TxReceipt> {
    const user = this.stellar.resolveSigner(userSecret);
    return this.write(
      contractId,
      'join_group',
      [toAddress(user.publicKey())],
      user,
    );
  }

  /** set_turn_order(admin, new_order). El primer ceil(30 %) exige puntaje >= 80 (si no: LowReputationForEarlyTurn). */
  async setTurnOrder(
    contractId: string,
    newOrder: string[],
  ): Promise<TxReceipt> {
    const admin = this.stellar.resolveSigner();
    return this.write(
      contractId,
      'set_turn_order',
      [toAddress(admin.publicKey()), toAddressVec(newOrder)],
      admin,
    );
  }

  /** start_group(admin). Requiere >= 2 miembros y orden de turnos completo. */
  async startGroup(contractId: string): Promise<TxReceipt> {
    const admin = this.stellar.resolveSigner();
    return this.write(
      contractId,
      'start_group',
      [toAddress(admin.publicKey())],
      admin,
    );
  }

  /** pay_round(user): paga la cuota de la ronda actual (hasta fin del período de gracia). */
  async payRound(contractId: string, userSecret: string): Promise<TxReceipt> {
    const user = this.stellar.resolveSigner(userSecret);
    return this.write(
      contractId,
      'pay_round',
      [toAddress(user.publicKey())],
      user,
    );
  }

  /**
   * settle_round(): sin permisos, válido tras vencimiento + gracia. Lo envía el admin.
   * Devuelve el beneficiario (Option<Address>) o null si la ronda quedó sin beneficiario.
   */
  async settleRound(contractId: string): Promise<SettleRoundResult> {
    const result = await this.invoker.invoke(
      'pasanaku',
      contractId,
      'settle_round',
      [],
      this.stellar.resolveSigner(),
    );
    const beneficiary = result.returnValue
      ? asOptionAddress(nativeOf(result.returnValue), 'settle_round')
      : null;
    return { txHash: result.txHash, ledger: result.ledger, beneficiary };
  }

  /** pay_arrears(debtor, round, amount): paga directo al beneficiario afectado. `amount` en stroops. */
  async payArrears(
    contractId: string,
    debtorSecret: string,
    round: number,
    amount: string,
  ): Promise<TxReceipt> {
    const debtor = this.stellar.resolveSigner(debtorSecret);
    return this.write(
      contractId,
      'pay_arrears',
      [toAddress(debtor.publicKey()), toU32(round), toI128(amount)],
      debtor,
    );
  }

  // ================================================================ lectura (simulación)

  async getConfig(contractId: string): Promise<GroupConfigView> {
    const raw = asRecord(
      await this.read(contractId, 'get_config'),
      'get_config',
    );
    const statusRaw = Array.isArray(raw.status) ? raw.status[0] : raw.status;
    if (!GROUP_STATUSES.includes(statusRaw as ContractGroupStatus)) {
      throw new Error(`Estado de grupo desconocido: ${String(statusRaw)}`);
    }
    return {
      admin: asAddress(raw.admin, 'admin'),
      token: asAddress(raw.token, 'token'),
      registry: asAddress(raw.registry, 'registry'),
      contribution: asAmount(raw.contribution, 'contribution'),
      guarantee: asAmount(raw.guarantee, 'guarantee'),
      roundDuration: asAmount(raw.round_duration, 'round_duration'),
      maxParticipants: asU32(raw.max_participants, 'max_participants'),
      isPublic: asBool(raw.is_public, 'is_public'),
      currentRound: asU32(raw.current_round, 'current_round'),
      deadline: asAmount(raw.deadline, 'deadline'),
      roundPool: asAmount(raw.round_pool, 'round_pool'),
      noBeneficiaryRounds: asU32(
        raw.no_beneficiary_rounds,
        'no_beneficiary_rounds',
      ),
      status: statusRaw as ContractGroupStatus,
      graceSeconds: asAmount(raw.grace_seconds, 'grace_seconds'),
    };
  }

  async getParticipants(contractId: string): Promise<string[]> {
    return asAddressList(
      await this.read(contractId, 'get_participants'),
      'get_participants',
    );
  }

  async getTurnQueue(contractId: string): Promise<string[]> {
    return asAddressList(
      await this.read(contractId, 'get_turn_queue'),
      'get_turn_queue',
    );
  }

  /** Lanza NotMember (#12) si el usuario no pertenece al grupo. */
  async getMember(contractId: string, user: string): Promise<MemberStateView> {
    const raw = asRecord(
      await this.read(contractId, 'get_member', [toAddress(user)]),
      'get_member',
    );
    return {
      guaranteeBalance: asAmount(raw.guarantee_balance, 'guarantee_balance'),
      totalContributed: asAmount(raw.total_contributed, 'total_contributed'),
      clean: asBool(raw.clean, 'clean'),
      joined: asBool(raw.joined, 'joined'),
    };
  }

  /** Deuda total pendiente del usuario (stroops). */
  async getDebt(contractId: string, user: string): Promise<string> {
    return asAmount(
      await this.read(contractId, 'get_debt', [toAddress(user)]),
      'get_debt',
    );
  }

  /** Faltante total que otros le deben al beneficiario (stroops). */
  async getShortfall(contractId: string, beneficiary: string): Promise<string> {
    return asAmount(
      await this.read(contractId, 'get_shortfall', [toAddress(beneficiary)]),
      'get_shortfall',
    );
  }

  // ================================================================ helpers

  private async read(
    contractId: string,
    method: string,
    args = [] as ReturnType<typeof toAddress>[],
  ) {
    return nativeOf(
      await this.invoker.read('pasanaku', contractId, method, args),
    );
  }

  private async write(
    contractId: string,
    method: string,
    args: ReturnType<typeof toAddress>[],
    signer: ReturnType<StellarService['resolveSigner']>,
  ): Promise<TxReceipt> {
    const result = await this.invoker.invoke(
      'pasanaku',
      contractId,
      method,
      args,
      signer,
    );
    return { txHash: result.txHash, ledger: result.ledger };
  }

  async initializeGroupContract(
    contractId: string,
    params: DeployGroupParams,
  ): Promise<TxReceipt> {
    const admin = this.stellar.resolveSigner();
    return this.write(
      contractId,
      'init',
      [
        toAddress(admin.publicKey()),
        toAddress(this.tokenId),
        toAddress(this.registryId),
        toI128(params.contribution),
        toI128(params.contribution),
        toU64(params.roundDurationSeconds),
        toU64(params.graceSeconds),
        toU32(params.maxParticipants),
        toBool(params.isPublic),
      ],
      admin,
    );
  }
}
