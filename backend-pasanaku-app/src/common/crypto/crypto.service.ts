import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  createCipheriv,
  createDecipheriv,
  createHmac,
  randomBytes,
} from 'node:crypto';
import { EnvVars } from '../../config/env.validation.js';

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 12; // recomendado para GCM
const TAG_LENGTH = 16;
const VERSION = 'v1';

/**
 * Cifrado AES-256-GCM para claves privadas Stellar y CI.
 * Formato almacenado (string): v1:<iv>:<authTag>:<ciphertext>  (base64)
 * Cada cifrado usa un IV aleatorio nuevo, así que el mismo texto produce salidas distintas.
 */
@Injectable()
export class CryptoService {
  private readonly key: Buffer;
  private readonly hmacKey: Buffer;

  constructor(config: ConfigService<EnvVars, true>) {
    this.key = Buffer.from(
      config.get('ENCRYPTION_KEY', { infer: true }),
      'hex',
    );
    if (this.key.length !== 32) {
      throw new Error('ENCRYPTION_KEY debe equivaler a 32 bytes');
    }
    // Subclave independiente para HMAC (no se reutiliza la clave de cifrado directamente)
    this.hmacKey = createHmac('sha256', this.key)
      .update('pasanaku:hmac:v1')
      .digest();
  }

  encrypt(plaintext: string): string {
    const iv = randomBytes(IV_LENGTH);
    const cipher = createCipheriv(ALGORITHM, this.key, iv, {
      authTagLength: TAG_LENGTH,
    });
    const ciphertext = Buffer.concat([
      cipher.update(plaintext, 'utf8'),
      cipher.final(),
    ]);
    const tag = cipher.getAuthTag();

    return [
      VERSION,
      iv.toString('base64'),
      tag.toString('base64'),
      ciphertext.toString('base64'),
    ].join(':');
  }

  /**
   * HMAC-SHA256 determinístico (hex) para unicidad y búsqueda (p. ej. hash del CI).
   * Un SHA-256 simple sería reversible por fuerza bruta (los CI tienen poca entropía).
   * Ojo: si rotas ENCRYPTION_KEY, estos hashes cambian.
   */
  hmac(value: string): string {
    return createHmac('sha256', this.hmacKey)
      .update(value, 'utf8')
      .digest('hex');
  }

  decrypt(payload: string): string {
    const parts = payload.split(':');
    if (parts.length !== 4 || parts[0] !== VERSION) {
      throw new Error('Formato de dato cifrado inválido');
    }

    const [, ivB64, tagB64, dataB64] = parts;
    try {
      const decipher = createDecipheriv(
        ALGORITHM,
        this.key,
        Buffer.from(ivB64, 'base64'),
        { authTagLength: TAG_LENGTH },
      );
      decipher.setAuthTag(Buffer.from(tagB64, 'base64'));
      return Buffer.concat([
        decipher.update(Buffer.from(dataB64, 'base64')),
        decipher.final(),
      ]).toString('utf8');
    } catch {
      // No filtrar detalles internos (clave incorrecta o dato alterado)
      throw new Error('No se pudo descifrar el dato');
    }
  }
}
