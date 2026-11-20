import {
  Injectable,
  Logger,
  ServiceUnavailableException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createHmac, randomUUID, timingSafeEqual } from 'node:crypto';

export interface QrPayment {
  pollarReference: string;
  /** Cadena a renderizar como QR en el cliente. */
  qrPayload: string;
  /** PNG/SVG en base64 si el proveedor lo entrega. */
  qrImageBase64: string | null;
  amountBob: string;
  expiresAt: Date | null;
}

/**
 * Adaptador de Pollar (BOB -> USDC). El modo simulación es el camino verificado.
 * ⚠ El contrato HTTP del modo real (rutas y campos marcados "ASUMIDO") NO está verificado
 * contra documentación oficial: es lo único que habría que ajustar con la doc de Pollar.
 *
 * Variables (todas opcionales): POLLAR_MOCK_MODE (por defecto true fuera de producción),
 * POLLAR_API_URL, POLLAR_API_KEY, POLLAR_WEBHOOK_SECRET, POLLAR_MOCK_BOB_PER_USDC (6.96).
 */
@Injectable()
export class PollarService {
  private readonly logger = new Logger(PollarService.name);
  readonly isMock: boolean;
  private readonly apiUrl: string;
  private readonly apiKey: string;
  private readonly webhookSecret: string;
  private readonly mockRate: number;

  constructor(config: ConfigService) {
    const explicit = config.get<string>('POLLAR_MOCK_MODE');
    this.isMock = explicit
      ? explicit === 'true'
      : config.get<string>('NODE_ENV') !== 'production';
    this.apiUrl = (config.get<string>('POLLAR_API_URL') ?? '').replace(
      /\/$/,
      '',
    );
    this.apiKey = config.get<string>('POLLAR_API_KEY') ?? '';
    this.webhookSecret = config.get<string>('POLLAR_WEBHOOK_SECRET') ?? '';
    this.mockRate = Number(
      config.get<string>('POLLAR_MOCK_BOB_PER_USDC') ?? '6.96',
    );
    if (this.isMock)
      this.logger.warn('Pollar en MODO SIMULACIÓN (sin pagos reales)');
  }

  /** BOB por 1 USDC. */
  async getBobPerUsdc(): Promise<number> {
    if (this.isMock) return this.mockRate;
    const data = await this.request<{ rate: number | string }>(
      'GET',
      '/rates/USDC-BOB',
    ); // ASUMIDO
    return Number(data.rate);
  }

  async createQrPayment(p: {
    amountBob: string;
    reference: string;
    description: string;
  }): Promise<QrPayment> {
    if (this.isMock) return this.mockQr(`mock_${randomUUID()}`, p.amountBob);
    const d = await this.request<Record<string, unknown>>(
      'POST',
      '/payments/qr',
      {
        // ASUMIDO
        amount: p.amountBob,
        currency: 'BOB',
        reference: p.reference,
        description: p.description,
      },
    );
    return this.parseQr(d, p.amountBob);
  }

  /** Recupera un QR ya emitido (reintento idempotente del cliente). */
  async getQrPayment(
    pollarReference: string,
    amountBob: string,
  ): Promise<QrPayment> {
    if (this.isMock) return this.mockQr(pollarReference, amountBob);
    const d = await this.request<Record<string, unknown>>(
      'GET',
      `/payments/qr/${pollarReference}`,
    ); // ASUMIDO
    return this.parseQr(d, amountBob);
  }

  /** HMAC-SHA256 (hex) del cuerpo CRUDO con POLLAR_WEBHOOK_SECRET. Falla cerrado si no hay secreto. */
  verifySignature(
    rawBody: Buffer | undefined,
    signature: string | undefined,
  ): boolean {
    if (!this.webhookSecret || !rawBody || !signature) return false;
    const expected = createHmac('sha256', this.webhookSecret)
      .update(rawBody)
      .digest('hex');
    const received = signature
      .replace(/^sha256=/i, '')
      .trim()
      .toLowerCase();
    const a = Buffer.from(expected);
    const b = Buffer.from(received);
    return a.length === b.length && timingSafeEqual(a, b);
  }

  // ───────────────────────────── internos ─────────────────────────────

  private mockQr(pollarReference: string, amountBob: string): QrPayment {
    return {
      pollarReference,
      qrPayload: `pasanaku-mock://pay/${pollarReference}?amount=${amountBob}&currency=BOB`,
      qrImageBase64: null,
      amountBob,
      expiresAt: new Date(Date.now() + 15 * 60_000),
    };
  }

  private parseQr(d: Record<string, unknown>, amountBob: string): QrPayment {
    const body = (d.data as Record<string, unknown> | undefined) ?? d;
    const reference = String(body.reference ?? body.id ?? '');
    const payload = String(body.qr_payload ?? body.qr ?? body.payload ?? '');
    if (!reference || !payload)
      throw new ServiceUnavailableException('Respuesta inesperada de Pollar.');
    return {
      pollarReference: reference,
      qrPayload: payload,
      qrImageBase64: (body.qr_image_base64 as string | undefined) ?? null,
      amountBob,
      expiresAt: body.expires_at ? new Date(String(body.expires_at)) : null,
    };
  }

  private async request<T>(
    method: 'GET' | 'POST',
    path: string,
    body?: unknown,
  ): Promise<T> {
    if (!this.apiUrl || !this.apiKey) {
      throw new ServiceUnavailableException(
        'Pollar no está configurado (POLLAR_API_URL / POLLAR_API_KEY).',
      );
    }
    try {
      const res = await fetch(`${this.apiUrl}${path}`, {
        method,
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${this.apiKey}`,
        },
        body: body ? JSON.stringify(body) : undefined,
        signal: AbortSignal.timeout(10_000),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return (await res.json()) as T;
    } catch (error) {
      this.logger.error(
        `Pollar ${method} ${path} falló: ${(error as Error).message}`,
      );
      throw new ServiceUnavailableException(
        'No se pudo contactar a Pollar. Intenta de nuevo.',
      );
    }
  }
}
