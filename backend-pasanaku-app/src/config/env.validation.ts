export type NodeEnv = 'development' | 'production' | 'test';
export type StellarNetwork = 'TESTNET' | 'PUBLIC';

export interface EnvVars {
  NODE_ENV: NodeEnv;
  PORT: number;

  DATABASE_URL: string;
  DATABASE_SSL: boolean;

  JWT_SECRET: string;
  JWT_EXPIRES_IN: string;

  /** Auto-aprueba el KYC. Por defecto: true fuera de producción, false en producción. */
  KYC_AUTO_APPROVE: boolean;

  /** 32 bytes en hexadecimal (64 caracteres). Genera con: openssl rand -hex 32 */
  ENCRYPTION_KEY: string;

  STELLAR_NETWORK: StellarNetwork;
  STELLAR_NETWORK_PASSPHRASE: string;
  STELLAR_HORIZON_URL: string;
  SOROBAN_RPC_URL: string;

  /** Semilla (S...) de la cuenta admin del servidor: paga comisiones (fee bump), fondea wallets y administra los contratos */
  STELLAR_ADMIN_SECRET: string;
  USDC_ASSET_CODE: string;
  USDC_ISSUER: string;
  /** ID (C...) del Stellar Asset Contract de ese USDC; debe coincidir con el derivado de code + issuer */
  USDC_CONTRACT_ID: string;
  REPUTATION_REGISTRY_ID: string;
  /** Hash SHA-256 (hex, 64 caracteres) del WASM de PasanakuContract ya subido a la red */
  PASANAKU_WASM_HASH: string;

  // Opcionales por ahora; se volverán obligatorias al implementar payments/
  POLLAR_API_URL?: string;
  POLLAR_API_KEY?: string;
  POLLAR_WEBHOOK_SECRET?: string;
}

const PASSPHRASES: Record<StellarNetwork, string> = {
  TESTNET: 'Test SDF Network ; September 2015',
  PUBLIC: 'Public Global Stellar Network ; September 2015',
};

const TESTNET_DEFAULTS = {
  horizon: 'https://horizon-testnet.stellar.org',
  rpc: 'https://soroban-testnet.stellar.org',
};

/**
 * Validador para `ConfigModule.forRoot({ validate })`.
 * Falla al arrancar si falta algo o tiene formato inválido.
 */
export function validateEnv(raw: Record<string, unknown>): EnvVars {
  const errors: string[] = [];

  const read = (key: string): string | undefined => {
    const value = raw[key];
    if (typeof value !== 'string') return undefined;
    const trimmed = value.trim();
    return trimmed === '' ? undefined : trimmed;
  };

  const required = (key: string): string => {
    const value = read(key);
    if (!value) {
      errors.push(`${key} es obligatoria`);
      return '';
    }
    return value;
  };

  const isUrl = (value: string): boolean => {
    try {
      new URL(value);
      return true;
    } catch {
      return false;
    }
  };

  // NODE_ENV
  const nodeEnv = (read('NODE_ENV') ?? 'development') as NodeEnv;
  if (!['development', 'production', 'test'].includes(nodeEnv)) {
    errors.push('NODE_ENV debe ser development, production o test');
  }

  // PORT
  const port = Number(read('PORT') ?? 3000);
  if (!Number.isInteger(port) || port < 1 || port > 65535) {
    errors.push('PORT debe ser un entero entre 1 y 65535');
  }

  // Database
  const databaseUrl = required('DATABASE_URL');
  if (databaseUrl && !/^postgres(ql)?:\/\//.test(databaseUrl)) {
    errors.push('DATABASE_URL debe empezar con postgres:// o postgresql://');
  }
  const sslRaw = (read('DATABASE_SSL') ?? 'false').toLowerCase();
  if (!['true', 'false'].includes(sslRaw)) {
    errors.push('DATABASE_SSL debe ser true o false');
  }

  // JWT
  const jwtSecret = required('JWT_SECRET');
  if (jwtSecret && jwtSecret.length < 32) {
    errors.push('JWT_SECRET debe tener al menos 32 caracteres');
  }
  const jwtExpiresIn = read('JWT_EXPIRES_IN') ?? '1d';

  // KYC
  const kycRaw = (
    read('KYC_AUTO_APPROVE') ?? (nodeEnv === 'production' ? 'false' : 'true')
  ).toLowerCase();
  if (!['true', 'false'].includes(kycRaw)) {
    errors.push('KYC_AUTO_APPROVE debe ser true o false');
  }

  // Cifrado
  const encryptionKey = required('ENCRYPTION_KEY');
  if (encryptionKey && !/^[0-9a-fA-F]{64}$/.test(encryptionKey)) {
    errors.push(
      'ENCRYPTION_KEY debe ser 64 caracteres hexadecimales (32 bytes). Genera con: openssl rand -hex 32',
    );
  }

  // Stellar / Soroban
  const network = (read('STELLAR_NETWORK') ?? 'TESTNET') as StellarNetwork;
  if (!['TESTNET', 'PUBLIC'].includes(network)) {
    errors.push('STELLAR_NETWORK debe ser TESTNET o PUBLIC');
  }

  const horizonUrl =
    read('STELLAR_HORIZON_URL') ??
    (network === 'TESTNET' ? TESTNET_DEFAULTS.horizon : undefined);
  const rpcUrl =
    read('SOROBAN_RPC_URL') ??
    (network === 'TESTNET' ? TESTNET_DEFAULTS.rpc : undefined);

  if (!horizonUrl || !isUrl(horizonUrl)) {
    errors.push(
      'STELLAR_HORIZON_URL es obligatoria y debe ser una URL válida en PUBLIC',
    );
  }
  if (!rpcUrl || !isUrl(rpcUrl)) {
    errors.push(
      'SOROBAN_RPC_URL es obligatoria y debe ser una URL válida en PUBLIC',
    );
  }

  const passphrase =
    read('STELLAR_NETWORK_PASSPHRASE') ?? PASSPHRASES[network] ?? '';

  const matching = (key: string, regex: RegExp, hint: string): string => {
    const value = required(key);
    if (value && !regex.test(value)) errors.push(`${key} ${hint}`);
    return value;
  };
  const stellarAdminSecret = matching(
    'STELLAR_ADMIN_SECRET',
    /^S[A-Z2-7]{55}$/,
    'debe ser una semilla secreta Stellar (S...)',
  );
  const usdcAssetCode = matching(
    'USDC_ASSET_CODE',
    /^[A-Za-z0-9]{1,12}$/,
    'debe tener entre 1 y 12 caracteres alfanuméricos',
  );
  const usdcIssuer = matching(
    'USDC_ISSUER',
    /^G[A-Z2-7]{55}$/,
    'debe ser una clave pública Stellar (G...)',
  );
  const usdcContractId = matching(
    'USDC_CONTRACT_ID',
    /^C[A-Z2-7]{55}$/,
    'debe ser un ID de contrato (C...)',
  );
  const reputationRegistryId = matching(
    'REPUTATION_REGISTRY_ID',
    /^C[A-Z2-7]{55}$/,
    'debe ser un ID de contrato (C...)',
  );
  const pasanakuWasmHash = matching(
    'PASANAKU_WASM_HASH',
    /^[0-9a-fA-F]{64}$/,
    'debe ser un hash SHA-256 en hexadecimal (64 caracteres)',
  );

  if (errors.length > 0) {
    throw new Error(
      `Variables de entorno inválidas:\n - ${errors.join('\n - ')}`,
    );
  }

  return {
    ...(raw as object),
    NODE_ENV: nodeEnv,
    PORT: port,
    DATABASE_URL: databaseUrl,
    DATABASE_SSL: sslRaw === 'true',
    JWT_SECRET: jwtSecret,
    JWT_EXPIRES_IN: jwtExpiresIn,
    KYC_AUTO_APPROVE: kycRaw === 'true',
    ENCRYPTION_KEY: encryptionKey,
    STELLAR_NETWORK: network,
    STELLAR_NETWORK_PASSPHRASE: passphrase,
    STELLAR_HORIZON_URL: horizonUrl as string,
    SOROBAN_RPC_URL: rpcUrl as string,
    STELLAR_ADMIN_SECRET: stellarAdminSecret,
    USDC_ASSET_CODE: usdcAssetCode,
    USDC_ISSUER: usdcIssuer,
    USDC_CONTRACT_ID: usdcContractId,
    REPUTATION_REGISTRY_ID: reputationRegistryId,
    PASANAKU_WASM_HASH: pasanakuWasmHash,
    POLLAR_API_URL: read('POLLAR_API_URL'),
    POLLAR_API_KEY: read('POLLAR_API_KEY'),
    POLLAR_WEBHOOK_SECRET: read('POLLAR_WEBHOOK_SECRET'),
  } as EnvVars;
}
