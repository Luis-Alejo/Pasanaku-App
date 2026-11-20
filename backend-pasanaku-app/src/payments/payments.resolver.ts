import { UseGuards } from '@nestjs/common';
import { Args, Mutation, Resolver } from '@nestjs/graphql';
import { CurrentUser } from '../common/decorators/current-user.decorator.js';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard.js';
import { TransactionRecordType } from '../transactions/dto/transaction.types.js';
import { InitiateQrPaymentInput, QrPaymentType } from './dto/payments.dto.js';
import { PaymentsService } from './payments.service.js';

@Resolver()
@UseGuards(JwtAuthGuard)
export class PaymentsResolver {
  constructor(private readonly payments: PaymentsService) {}

  @Mutation(() => QrPaymentType)
  initiateQrPayment(
    @CurrentUser('id') userId: string,
    @Args('input') input: InitiateQrPaymentInput,
  ) {
    return this.payments.initiateFiatContribution(userId, input);
  }

  /** Solo con Pollar en modo simulación; solo el dueño del QR. */
  @Mutation(() => TransactionRecordType)
  simulateQrPayment(
    @CurrentUser('id') userId: string,
    @Args('pollarReference', { type: () => String }) pollarReference: string,
  ) {
    return this.payments.simulatePayment(userId, pollarReference);
  }
}
