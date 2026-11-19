import { Inject, Injectable } from '@nestjs/common';
import {
  Account,
  Address,
  BASE_FEE,
  Contract,
  Keypair,
  Operation,
  TransactionBuilder,
  rpc,
  scValToNative,
  xdr,
} from '@stellar/stellar-sdk';
import { randomBytes } from 'node:crypto';
import { StellarService, TX_TIMEOUT_SECONDS } from '../stellar/stellar.service.js';
import { STELLAR_RPC } from '../stellar/stellar.tokens.js';
import {
  ContractKind,
  SorobanSimulationError,
  toSorobanError,
} from './soroban-errors.js';

export interface InvokeResult {
  txHash: string;
  ledger: number;
  returnValue?: xdr.ScVal;
}

/**
 * INTERNO de blockchain/soroban: construye, simula, firma y envía invocaciones.
 * No se exporta desde BlockchainModule; ningún otro módulo toca XDR.
 */
@Injectable()
export class SorobanInvokerService {
  constructor(
    private readonly stellar: StellarService,
    @Inject(STELLAR_RPC) private readonly server: rpc.Server,
  ) {}

  /** Lectura: solo simula (no consume fee ni sequence). */
  async read(
    kind: ContractKind,
    contractId: string,
    method: string,
    args: xdr.ScVal[] = [],
  ): Promise<xdr.ScVal> {
    // La simulación no valida el sequence: sirve una cuenta cualquiera existente
    const source = new Account(this.stellar.adminPublicKey, '0');
    const tx = new TransactionBuilder(source, {
      fee: BASE_FEE,
      networkPassphrase: this.stellar.networkPassphrase,
    })
      .addOperation(new Contract(contractId).call(method, ...args))
      .setTimeout(30)
      .build();

    const simulation = await this.server.simulateTransaction(tx);
    if (rpc.Api.isSimulationError(simulation)) {
      throw toSorobanError(kind, simulation.error);
    }
    if (!rpc.Api.isSimulationSuccess(simulation) || !simulation.result) {
      throw new SorobanSimulationError(
        `La simulación de ${method} no devolvió resultado`,
      );
    }
    return simulation.result.retval;
  }

  /**
   * Escritura. `signer` es la fuente de la transacción: si no es el admin, el admin paga
   * la comisión con un fee bump. Las firmas de `require_auth` del usuario quedan cubiertas
   * por ser él la cuenta fuente (no hacen falta auth entries aparte).
   */
  async invoke(
    kind: ContractKind,
    contractId: string,
    method: string,
    args: xdr.ScVal[],
    signer: Keypair,
  ): Promise<InvokeResult> {
    const operation = new Contract(contractId).call(method, ...args);
    return this.submit(kind, operation, signer);
  }

  /** Despliega una instancia del WASM ya subido (`wasmHashHex`) con el admin como deployer. */
  async createContract(
    wasmHashHex: string,
  ): Promise<InvokeResult & { contractId: string }> {
    const admin = this.stellar.resolveSigner();
    const operation = Operation.createCustomContract({
      address: new Address(admin.publicKey()),
      wasmHash: Buffer.from(wasmHashHex, 'hex'),
      salt: randomBytes(32),
    });
    const result = await this.submit('pasanaku', operation, admin);
    if (!result.returnValue) {
      throw new SorobanSimulationError(
        'El despliegue no devolvió el ID del contrato',
      );
    }
    const contractId = scValToNative(result.returnValue) as string;
    return { ...result, contractId };
  }

  private async submit(
    kind: ContractKind,
    operation: xdr.Operation,
    signer: Keypair,
  ): Promise<InvokeResult> {
    const confirmed = await this.stellar.executeAsSource(
      signer.publicKey(),
      async (account) => {
        const raw = new TransactionBuilder(account, {
          fee: BASE_FEE,
          networkPassphrase: this.stellar.networkPassphrase,
        })
          .addOperation(operation)
          .setTimeout(TX_TIMEOUT_SECONDS)
          .build();

        let prepared;
        try {
          prepared = await this.server.prepareTransaction(raw);
        } catch (error) {
          throw toSorobanError(kind, (error as Error).message, error);
        }
        return this.stellar.signAndWrap(prepared, signer);
      },
    );

    return {
      txHash: confirmed.hash,
      ledger: confirmed.ledger,
      returnValue: confirmed.returnValue,
    };
  }
}
