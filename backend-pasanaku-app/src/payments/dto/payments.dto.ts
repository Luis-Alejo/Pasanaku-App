import {
  Field,
  ID,
  InputType,
  Int,
  ObjectType,
  registerEnumType,
} from '@nestjs/graphql';
import {
  IsEnum,
  IsOptional,
  IsString,
  IsUUID,
  Length,
  Matches,
  Min,
  IsInt,
} from 'class-validator';

export enum PaymentPurpose {
  TOPUP = 'TOPUP', // solo recargar USDC a la wallet
  JOIN = 'JOIN', // recargar la garantía y unirse al grupo
  CONTRIBUTION = 'CONTRIBUTION', // recargar la cuota y pagar la ronda
  ARREARS = 'ARREARS', // recargar y pagar una deuda
}
registerEnumType(PaymentPurpose, { name: 'PaymentPurpose' });

@InputType()
export class InitiateQrPaymentInput {
  @Field(() => PaymentPurpose)
  @IsEnum(PaymentPurpose)
  purpose: PaymentPurpose;

  @Field(() => ID, { nullable: true, description: 'Requerido salvo TOPUP' })
  @IsOptional()
  @IsUUID()
  groupId?: string;

  @Field(() => Int, {
    nullable: true,
    description: 'Ronda original de la deuda (ARREARS)',
  })
  @IsOptional()
  @IsInt()
  @Min(1)
  round?: number;

  @Field(() => String, {
    nullable: true,
    description: 'Solo TOPUP, p. ej. "100" o "55.50"',
  })
  @IsOptional()
  @Matches(/^\d+(\.\d{1,2})?$/, { message: 'amountBob inválido' })
  amountBob?: string;

  @Field(() => String, {
    nullable: true,
    description: 'Reintentos del cliente sin duplicar el cobro',
  })
  @IsOptional()
  @IsString()
  @Length(8, 64)
  idempotencyKey?: string;
}

@ObjectType()
export class QrPaymentType {
  @Field(() => ID) transactionId: string;
  @Field(() => String) pollarReference: string;
  @Field(() => String) qrPayload: string;
  @Field(() => String, { nullable: true }) qrImageBase64: string | null;
  @Field(() => String) amountBob: string;
  @Field(() => String) amountStroops: string;
  @Field(() => String) exchangeRate: string;
  @Field(() => Date, { nullable: true }) expiresAt: Date | null;
  @Field(() => Boolean) mock: boolean;
}
