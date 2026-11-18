import {
  Address,
  StrKey,
  nativeToScVal,
  scValToNative,
  xdr,
} from '@stellar/stellar-sdk';

// ------------------------------------------------------------------ codificación (TS -> ScVal)

export function toAddress(value: string): xdr.ScVal {
  if (
    !StrKey.isValidEd25519PublicKey(value) &&
    !StrKey.isValidContract(value)
  ) {
    throw new Error(`Dirección Stellar inválida: "${value}"`);
  }
  return new Address(value).toScVal();
}

export function toAddressVec(values: string[]): xdr.ScVal {
  return xdr.ScVal.scvVec(values.map(toAddress));
}

export function toU32(value: number): xdr.ScVal {
  if (!Number.isInteger(value) || value < 0 || value > 4_294_967_295) {
    throw new Error(`u32 inválido: ${value}`);
  }
  return xdr.ScVal.scvU32(value);
}

export function toU64(value: string | number | bigint): xdr.ScVal {
  const big = parseUnsigned(value, 'u64');
  if (big > 18_446_744_073_709_551_615n)
    throw new Error(`u64 fuera de rango: ${value}`);
  return nativeToScVal(big, { type: 'u64' });
}

/** Montos en stroops como string/bigint. Solo positivos o cero (el contrato valida el resto). */
export function toI128(value: string | bigint): xdr.ScVal {
  return nativeToScVal(parseUnsigned(value, 'i128'), { type: 'i128' });
}

export function toBool(value: boolean): xdr.ScVal {
  return xdr.ScVal.scvBool(value);
}

function parseUnsigned(value: string | number | bigint, label: string): bigint {
  if (typeof value === 'number' && !Number.isSafeInteger(value)) {
    throw new Error(
      `${label} inválido: ${value} (usa string para valores grandes)`,
    );
  }
  const text = String(value).trim();
  if (!/^\d+$/.test(text)) throw new Error(`${label} inválido: "${text}"`);
  return BigInt(text);
}

// ------------------------------------------------------------------ decodificación (ScVal -> TS)

export function nativeOf(value: xdr.ScVal): unknown {
  return scValToNative(value);
}

export function asBigInt(value: unknown, label: string): bigint {
  if (typeof value === 'bigint') return value;
  if (typeof value === 'number' && Number.isSafeInteger(value))
    return BigInt(value);
  if (typeof value === 'string' && /^-?\d+$/.test(value)) return BigInt(value);
  throw new Error(
    `Se esperaba un entero en "${label}" y llegó ${typeof value}`,
  );
}

/** i128 / u64 -> string decimal (nunca number). */
export function asAmount(value: unknown, label: string): string {
  return asBigInt(value, label).toString();
}

export function asU32(value: unknown, label: string): number {
  const big = asBigInt(value, label);
  if (big < 0n || big > 4_294_967_295n)
    throw new Error(`"${label}" fuera del rango u32`);
  return Number(big);
}

export function asBool(value: unknown, label: string): boolean {
  if (typeof value !== 'boolean')
    throw new Error(`Se esperaba bool en "${label}"`);
  return value;
}

export function asAddress(value: unknown, label: string): string {
  if (typeof value !== 'string' || !/^[GC][A-Z2-7]{55}$/.test(value)) {
    throw new Error(`Se esperaba una dirección en "${label}"`);
  }
  return value;
}

export function asAddressList(value: unknown, label: string): string[] {
  if (!Array.isArray(value))
    throw new Error(`Se esperaba Vec<Address> en "${label}"`);
  return value.map((item, index) => asAddress(item, `${label}[${index}]`));
}

/** Option<Address>: None llega como null/undefined. */
export function asOptionAddress(value: unknown, label: string): string | null {
  return value === null || value === undefined ? null : asAddress(value, label);
}

export function asRecord(
  value: unknown,
  label: string,
): Record<string, unknown> {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    throw new Error(`Se esperaba un struct en "${label}"`);
  }
  return value as Record<string, unknown>;
}
