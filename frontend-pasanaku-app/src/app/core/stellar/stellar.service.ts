import { Injectable } from '@angular/core';
import { environment } from '@env/environment';

/** Saldo de un activo en una cuenta Stellar. */
export interface WalletBalance {
  /** "XLM" para el activo nativo; si no, el código del activo (ej. "USDC"). */
  code: string;
  /** Monto decimal en texto, como lo devuelve Stellar ("1250.5000000"). */
  amount: string;
  /** Stellar usa 7 decimales para todos los activos. */
  decimals: number;
  issuer?: string;
}

/**
 * Lectura de la billetera Stellar del usuario.
 * La firma de transacciones la hace el backend con la clave custodiada del
 * usuario: la app nunca maneja claves secretas.
 */
@Injectable({
  providedIn: 'root',
  useFactory: () => (environment.useMocks ? new MockStellarService() : new StellarService()),
})
export class StellarService {
  /** Saldos de la cuenta en Testnet (consulta pública a Horizon). Cuenta sin fondos → lista vacía. */
  async getBalances(address: string): Promise<WalletBalance[]> {
    const res = await fetch(`${environment.stellar.horizonUrl}/accounts/${encodeURIComponent(address)}`);
    if (res.status === 404) {
      return []; // la cuenta todavía no existe en la red
    }
    if (!res.ok) {
      throw new Error(`Horizon respondió ${res.status}`);
    }
    const data = (await res.json()) as { balances: HorizonBalance[] };
    return data.balances.map((b) => ({
      code: b.asset_type === 'native' ? 'XLM' : (b.asset_code ?? '?'),
      amount: b.balance,
      decimals: 7,
      issuer: b.asset_issuer,
    }));
  }
}

interface HorizonBalance {
  balance: string;
  asset_type: string;
  asset_code?: string;
  asset_issuer?: string;
}

/** Saldos de ejemplo con `environment.useMocks` (las direcciones del mock no existen en la red). */
export class MockStellarService extends StellarService {
  override getBalances(): Promise<WalletBalance[]> {
    return new Promise((resolve) =>
      setTimeout(
        () =>
          resolve([
            { code: 'XLM', amount: '9998.5000000', decimals: 7 },
            { code: 'USDC', amount: '1250.5000000', decimals: 7 },
            { code: 'BOB', amount: '3400.0000000', decimals: 7 },
          ]),
        400,
      ),
    );
  }
}
