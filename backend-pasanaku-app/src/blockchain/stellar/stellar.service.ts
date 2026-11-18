import { Inject, Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  Account,
  Asset,
  BASE_FEE,
  FeeBumpTransaction,
  Horizon,
  Keypair,
  Operation,
  Transaction,
  TransactionBuilder,
  rpc,
  xdr,
} from '@stellar/stellar-sdk';
import { EnvVars, StellarNetwork } from '../../config/env.validation.js';
import {
  WalletKeyGenerator,
  GeneratedKeypair,
} from '../../users/ports/wallet-key-generator.port.js';
import { SequenceManagerService } from './sequence-manager.service.js';
import {
  StellarSubmissionError,
  StellarTransactionExpiredError,
  StellarTransactionFailedError,
  StellarUncertainResultError,
} from './stellar.errors.js';
import { STELLAR_HORIZON, STELLAR_RPC } from './stellar.tokens.js';

/** Vigencia (timebounds) de cada transacción. Pasado este tiempo es imposible que se incluya. */
export const TX_TIMEOUT_SECONDS = 60;

const CONFIRM_POLL_MS = 1_000;
const MAX_SEND_ATTEMPTS = 5;
const MAX_BUILD_ATTEMPTS = 3;
/** Mínimo con 1 trustline = 1.5 XLM; 2 deja margen. Las comisiones las paga el admin. */
const ACCOUNT_STARTING_BALANCE = '2';

export interface ConfirmedTransaction {
  hash: string;
  ledger: number;
  returnValue?: xdr.ScVal;
}

export interface WalletActivationResult {
  publicKey: string;
  accountCreated: boolean;
  trustlineCreated: boolean;
  txHash?: string;
}

type TxLookup =
  | { status: 'NOT_FOUND' }
  | { status: 'SUCCESS'; ledger: number; returnValue?: xdr.ScVal }
  | { status: 'FAILED'; ledger: number; resultCode: string };

const sleep = (ms: number) =>
  new Promise<void>((resolve) => setTimeout(resolve, ms));

function isNotFound(error: unknown): boolean {
  const e = error as
    { response?: { status?: number }; name?: string } | undefined;
  return e?.response?.status === 404 || e?.name === 'NotFoundError';
}

/**
 * Único punto del backend que firma y envía transacciones Stellar.
 * Los métodos marcados @internal son para los servicios de soroban/ dentro de blockchain/.
 */
@Injectable()
export class StellarService implements WalletKeyGenerator, OnModuleInit {
  private readonly logger = new Logger(StellarService.name);
  private readonly adminKeypair: Keypair;
  private readonly network: StellarNetwork;
  private readonly configuredUsdcContractId: string;

  readonly networkPassphrase: string;
  readonly usdcAsset: Asset;

  constructor(
    config: ConfigService<EnvVars, true>,
    @Inject(STELLAR_RPC) private readonly server: rpc.Server,
    @Inject(STELLAR_HORIZON) private readonly horizon: Horizon.Server,
    private readonly sequence: SequenceManagerService,
  ) {
    this.network = config.get('STELLAR_NETWORK', { infer: true });
    this.networkPassphrase = config.get('STELLAR_NETWORK_PASSPHRASE', {
      infer: true,
    });
    this.adminKeypair = Keypair.fromSecret(
      config.get('STELLAR_ADMIN_SECRET', { infer: true }),
    );
    this.usdcAsset = new Asset(
      config.get('USDC_ASSET_CODE', { infer: true }),
      config.get('USDC_ISSUER', { infer: true }),
    );
    this.configuredUsdcContractId = config.get('USDC_CONTRACT_ID', {
      infer: true,
    });
  }

  get adminPublicKey(): string {
    return this.adminKeypair.publicKey();
  }

  async onModuleInit(): Promise<void> {
    // Fallar al arrancar si el SAC configurado no es el de este USDC: evitaría fondos mal dirigidos.
    const derived = this.usdcAsset.contractId(this.networkPassphrase);
    if (derived !== this.configuredUsdcContractId) {
      throw new Error(
        `USDC_CONTRACT_ID (${this.configuredUsdcContractId}) no coincide con el contrato derivado de ` +
          `${this.usdcAsset.getCode()}:${this.usdcAsset.getIssuer()} (${derived})`,
      );
    }

    try {
      await this.ensureAdminAccount();
    } catch (error) {
      this.logger.warn(
        `No se pudo verificar la cuenta admin: ${(error as Error).message}`,
      );
    }
  }

  // ------------------------------------------------------------------ puerto de users/

  /** Implementa WalletKeyGenerator (users/). No toca la red: la cuenta se activa aparte. */
  generateKeypair(): GeneratedKeypair {
    const keypair = Keypair.random();
    return { publicKey: keypair.publicKey(), secret: keypair.secret() };
  }

  // ------------------------------------------------------------------ activación de wallets

  /**
   * Crea la cuenta (2 XLM desde la cuenta admin) y la trustline USDC en UNA sola transacción
   * atómica, con comisiones a cargo del admin. Es idempotente: si la cuenta ya existe solo
   * añade la trustline que falte; si ya está todo, no envía nada.
   */
  async activateAndSetupUsdcWallet(
    userSecretKey: string,
  ): Promise<WalletActivationResult> {
    const user = Keypair.fromSecret(userSecretKey);
    const publicKey = user.publicKey();

    const creation = await this.sequence.exclusive(publicKey, async () => {
      if (await this.loadHorizonAccount(publicKey)) return null;
      return this.executeAsSource(this.adminPublicKey, async (adminAccount) => {
        const tx = new TransactionBuilder(adminAccount, {
          fee: BASE_FEE,
          networkPassphrase: this.networkPassphrase,
        })
          .addOperation(
            Operation.createAccount({
              destination: publicKey,
              startingBalance: ACCOUNT_STARTING_BALANCE,
            }),
          )
          .addOperation(
            Operation.changeTrust({ asset: this.usdcAsset, source: publicKey }),
          )
          .setTimeout(TX_TIMEOUT_SECONDS)
          .build();
        tx.sign(this.adminKeypair, user);
        return tx;
      });
    });

    if (creation) {
      return {
        publicKey,
        accountCreated: true,
        trustlineCreated: true,
        txHash: creation.hash,
      };
    }

    const account = await this.loadHorizonAccount(publicKey);
    if (account && this.hasUsdcTrustline(account)) {
      return { publicKey, accountCreated: false, trustlineCreated: false };
    }

    const confirmed = await this.executeAsSource(
      publicKey,
      async (userAccount) => {
        const inner = new TransactionBuilder(userAccount, {
          fee: BASE_FEE,
          networkPassphrase: this.networkPassphrase,
        })
          .addOperation(Operation.changeTrust({ asset: this.usdcAsset }))
          .setTimeout(TX_TIMEOUT_SECONDS)
          .build();
        return this.signAndWrap(inner, user);
      },
    );
    return {
      publicKey,
      accountCreated: false,
      trustlineCreated: true,
      txHash: confirmed.hash,
    };
  }

  // ------------------------------------------------------------------ firma y envío

  /** @internal Devuelve el keypair del secreto dado, o el del admin si no se pasa ninguno. */
  resolveSigner(secret?: string): Keypair {
    return secret ? Keypair.fromSecret(secret) : this.adminKeypair;
  }

  /**
   * @internal Firma con `signer`. Si no es el admin, envuelve en un FeeBumpTransaction para
   * que el admin pague la comisión (la cuenta del usuario no necesita XLM libre).
   */
  signAndWrap(
    tx: Transaction,
    signer: Keypair,
  ): Transaction | FeeBumpTransaction {
    tx.sign(signer);
    if (signer.publicKey() === this.adminPublicKey) return tx;

    const rate = Math.max(
      Math.ceil(Number(tx.fee) / tx.operations.length),
      1_000,
    );
    const feeBump = TransactionBuilder.buildFeeBumpTransaction(
      this.adminKeypair,
      String(rate),
      tx,
      this.networkPassphrase,
    );
    feeBump.sign(this.adminKeypair);
    return feeBump;
  }

  /**
   * @internal Bajo el lock de `sourcePublicKey`, construye (con sequence fresco), envía y
   * confirma. Si la transacción vence sin haberse incluido (comprobado por hash), la
   * reconstruye hasta MAX_BUILD_ATTEMPTS veces, siempre sin soltar el lock.
   */
  executeAsSource(
    sourcePublicKey: string,
    build: (account: Account) => Promise<Transaction | FeeBumpTransaction>,
  ): Promise<ConfirmedTransaction> {
    return this.sequence.withAccount(sourcePublicKey, async (loadAccount) => {
      for (let attempt = 1; ; attempt++) {
        const tx = await build(await loadAccount());
        try {
          return await this.submitAndConfirm(tx);
        } catch (error) {
          if (
            error instanceof StellarTransactionExpiredError &&
            attempt < MAX_BUILD_ATTEMPTS
          ) {
            this.logger.warn(
              `Tx ${error.txHash} vencida; reconstruyendo (intento ${attempt + 1})`,
            );
            continue;
          }
          throw error;
        }
      }
    });
  }

  /**
   * Envía la MISMA transacción firmada (mismo hash) y espera su resultado.
   * Ante timeout/errores de red o respuestas ambiguas NO reenvía a ciegas: primero consulta
   * el estado por hash en Soroban RPC (y Horizon como respaldo).
   */
  async submitAndConfirm(
    tx: Transaction | FeeBumpTransaction,
  ): Promise<ConfirmedTransaction> {
    const hash = Buffer.from(tx.hash()).toString('hex');
    let lastError: unknown;

    for (let attempt = 1; attempt <= MAX_SEND_ATTEMPTS; attempt++) {
      if (attempt > 1) {
        const known = await this.lookupSafely(hash);
        if (known && known.status !== 'NOT_FOUND')
          return this.settle(hash, known);
        await sleep(500 * attempt);
      }

      try {
        const response = await this.server.sendTransaction(tx);

        if (response.status === 'PENDING' || response.status === 'DUPLICATE') {
          return await this.waitForConfirmation(hash, tx);
        }
        if (response.status === 'TRY_AGAIN_LATER') {
          lastError = new Error('El RPC respondió TRY_AGAIN_LATER');
          continue;
        }

        // ERROR: puede ser el reenvío de una tx que ya entró (tx_bad_seq). Comprobar por hash.
        const known = await this.lookupSafely(hash);
        if (known && known.status !== 'NOT_FOUND')
          return this.settle(hash, known);
        throw new StellarSubmissionError(
          hash,
          this.resultCodeOf(response.errorResult),
        );
      } catch (error) {
        if (
          error instanceof StellarSubmissionError ||
          error instanceof StellarTransactionFailedError ||
          error instanceof StellarTransactionExpiredError
        ) {
          throw error;
        }
        lastError = error;
        this.logger.warn(
          `Envío de ${hash} con resultado incierto: ${(error as Error).message}`,
        );
      }
    }

    throw new StellarUncertainResultError(hash, lastError);
  }

  /** Estado de una transacción por hash (RPC primero, Horizon como respaldo). */
  getTransactionStatus(hash: string): Promise<TxLookup> {
    return this.lookupTransaction(hash);
  }

  // ------------------------------------------------------------------ internos

  private async waitForConfirmation(
    hash: string,
    tx: Transaction | FeeBumpTransaction,
  ): Promise<ConfirmedTransaction> {
    const inner = tx instanceof FeeBumpTransaction ? tx.innerTransaction : tx;
    const maxTime = Number(inner.timeBounds?.maxTime ?? 0);
    // Pasado maxTime (+ margen por desfase de reloj) la tx ya no puede incluirse
    const deadlineMs =
      maxTime > 0 ? (maxTime + 15) * 1_000 : Date.now() + 90_000;

    for (;;) {
      const lookup = await this.lookupSafely(hash);
      if (lookup && lookup.status !== 'NOT_FOUND')
        return this.settle(hash, lookup);

      if (Date.now() > deadlineMs) {
        // lookup === undefined => no pudimos consultar: resultado incierto, NO reconstruir
        if (!lookup) throw new StellarUncertainResultError(hash);
        throw new StellarTransactionExpiredError(hash);
      }
      await sleep(CONFIRM_POLL_MS);
    }
  }

  private settle(
    hash: string,
    lookup: Exclude<TxLookup, { status: 'NOT_FOUND' }>,
  ): ConfirmedTransaction {
    if (lookup.status === 'FAILED') {
      throw new StellarTransactionFailedError(hash, lookup.resultCode);
    }
    return { hash, ledger: lookup.ledger, returnValue: lookup.returnValue };
  }

  private async lookupSafely(hash: string): Promise<TxLookup | undefined> {
    try {
      return await this.lookupTransaction(hash);
    } catch (error) {
      this.logger.warn(
        `No se pudo consultar ${hash}: ${(error as Error).message}`,
      );
      return undefined;
    }
  }

  private async lookupTransaction(hash: string): Promise<TxLookup> {
    let rpcError: unknown;
    try {
      const response = await this.server.getTransaction(hash);
      if (response.status === rpc.Api.GetTransactionStatus.SUCCESS) {
        return {
          status: 'SUCCESS',
          ledger: response.ledger,
          returnValue: response.returnValue,
        };
      }
      if (response.status === rpc.Api.GetTransactionStatus.FAILED) {
        return {
          status: 'FAILED',
          ledger: response.ledger,
          resultCode: this.resultCodeOf(response.resultXdr),
        };
      }
    } catch (error) {
      rpcError = error;
    }

    try {
      const record = await this.horizon.transactions().transaction(hash).call();
      if (record.successful) {
        return {
          status: 'SUCCESS',
          ledger: record.ledger_attr,
          returnValue: this.returnValueFromMeta(record.result_meta_xdr),
        };
      }
      return {
        status: 'FAILED',
        ledger: record.ledger_attr,
        resultCode: 'tx_failed',
      };
    } catch (error) {
      if (!isNotFound(error)) throw rpcError ?? error;
      // Horizon dice 404 pero el RPC no respondió: no es concluyente
      if (rpcError) throw rpcError;
      return { status: 'NOT_FOUND' };
    }
  }

  /**
   * Mejor esfuerzo: el valor de retorno de una invocación Soroban desde el meta de Horizon.
   * Los tipos XDR cambiaron entre versiones del SDK (métodos `v4()` vs propiedades `v4`),
   * por eso se accede de forma tolerante a ambas.
   */
  private returnValueFromMeta(resultMetaXdr: string): xdr.ScVal | undefined {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const read = (target: any, key: string): any => {
      try {
        const value = target?.[key];
        return typeof value === 'function' ? value.call(target) : value;
      } catch {
        return undefined;
      }
    };
    try {
      const meta = xdr.TransactionMeta.fromXDR(resultMetaXdr, 'base64');
      for (const arm of ['v4', 'v3']) {
        const returnValue = read(
          read(read(meta, arm), 'sorobanMeta'),
          'returnValue',
        );
        if (returnValue) return returnValue as xdr.ScVal;
      }
    } catch {
      /* sin valor de retorno */
    }
    return undefined;
  }

  /** Código de resultado (p. ej. "txFailed", "txBadSeq"); tolerante a cambios de versión del SDK. */
  private resultCodeOf(result: unknown): string {
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const raw = result as any;
      const inner =
        typeof raw?.result === 'function' ? raw.result() : raw?.result;
      const code =
        typeof inner?.switch === 'function'
          ? inner.switch()
          : (inner?.type ?? inner?.code);
      return String(code?.name ?? code ?? 'unknown');
    } catch {
      return 'unknown';
    }
  }

  private async loadHorizonAccount(
    publicKey: string,
  ): Promise<Horizon.AccountResponse | null> {
    try {
      return await this.horizon.loadAccount(publicKey);
    } catch (error) {
      if (isNotFound(error)) return null;
      throw error;
    }
  }

  private hasUsdcTrustline(account: Horizon.AccountResponse): boolean {
    return account.balances.some(
      (balance) =>
        'asset_code' in balance &&
        'asset_issuer' in balance &&
        balance.asset_code === this.usdcAsset.getCode() &&
        balance.asset_issuer === this.usdcAsset.getIssuer(),
    );
  }

  /** En Testnet, Friendbot fondea la cuenta admin la primera vez. */
  private async ensureAdminAccount(): Promise<void> {
    if (await this.loadHorizonAccount(this.adminPublicKey)) return;
    if (this.network !== 'TESTNET') {
      this.logger.warn(
        `La cuenta admin ${this.adminPublicKey} no existe en la red; fondéala manualmente`,
      );
      return;
    }
    await this.horizon.friendbot(this.adminPublicKey).call();
    this.logger.log(
      `Cuenta admin ${this.adminPublicKey} fondeada con Friendbot`,
    );
  }

  async mintTestnetUsdc(
    destination: string,
    amountStroops: string,
  ): Promise<{ txHash: string }> {
    if (this.network !== 'TESTNET')
      throw new Error('mintTestnetUsdc solo en Testnet');
    if (this.usdcAsset.getIssuer() !== this.adminPublicKey) {
      throw new Error('USDC_ISSUER debe ser la cuenta admin para poder acuñar');
    }
    const s = BigInt(amountStroops);
    const amount = `${s / 10_000_000n}.${(s % 10_000_000n).toString().padStart(7, '0')}`;
    const confirmed = await this.executeAsSource(
      this.adminPublicKey,
      async (account) => {
        const tx = new TransactionBuilder(account, {
          fee: BASE_FEE,
          networkPassphrase: this.networkPassphrase,
        })
          .addOperation(
            Operation.payment({ destination, asset: this.usdcAsset, amount }),
          )
          .setTimeout(TX_TIMEOUT_SECONDS)
          .build();
        tx.sign(this.adminKeypair);
        return tx;
      },
    );
    return { txHash: confirmed.hash };
  }
}
