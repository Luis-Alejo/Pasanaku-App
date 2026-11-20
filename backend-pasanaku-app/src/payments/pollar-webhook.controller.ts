import type { Request } from 'express';
import type { RawBodyRequest } from '@nestjs/common';
import { Body, Controller, Headers, HttpCode, Post, Req } from '@nestjs/common';
import { SkipThrottle } from '@nestjs/throttler';
import { PaymentsService } from './payments.service.js';

/** Público (Pollar no envía JWT): la autenticación es la firma HMAC del cuerpo crudo. */
@SkipThrottle()
@Controller('webhooks/pollar')
export class PollarWebhookController {
  constructor(private readonly payments: PaymentsService) {}

  @Post()
  @HttpCode(200)
  handle(
    @Req() req: RawBodyRequest<Request>,
    @Headers('x-pollar-signature') signature: string | undefined, // ASUMIDO: nombre del header
    @Body() payload: Record<string, unknown>,
  ) {
    return this.payments.handlePollarWebhook(req.rawBody, payload, signature);
  }
}
