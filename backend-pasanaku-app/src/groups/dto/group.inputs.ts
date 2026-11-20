import { Field, ID, InputType, Int } from '@nestjs/graphql';
import {
  ArrayMaxSize,
  ArrayMinSize,
  IsArray,
  IsBoolean,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  Length,
  Matches,
  Max,
  MaxLength,
  Min,
} from 'class-validator';
import { Frequency } from '../../common/enums/index.js';

const USDC_REGEX = /^\d+(\.\d{1,7})?$/;

@InputType()
export class CreateGroupInput {
  @Field(() => String)
  @IsString()
  @Length(3, 120)
  name: string;

  @Field(() => String, { nullable: true })
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  description?: string;

  @Field(() => String, { description: 'Cuota en USDC, p. ej. "25" o "12.5"' })
  @Matches(USDC_REGEX, { message: 'contributionUsdc inválido' })
  contributionUsdc: string;

  @Field(() => Int)
  @IsInt()
  @Min(2)
  @Max(20)
  maxParticipants: number;

  @Field(() => Frequency)
  @IsEnum(Frequency)
  frequency: Frequency;

  @Field(() => Boolean, { defaultValue: true })
  @IsBoolean()
  isPublic: boolean;

  @Field(() => Int, { nullable: true, description: 'Solo Testnet/demo' })
  @IsOptional()
  @IsInt()
  @Min(60)
  roundDurationSeconds?: number;

  @Field(() => Int, { nullable: true, description: 'Solo Testnet/demo' })
  @IsOptional()
  @IsInt()
  @Min(30)
  graceDurationSeconds?: number;
}

@InputType()
export class InviteMemberInput {
  @Field(() => ID) @IsUUID() groupId: string;
  @Field(() => String) @IsString() @Length(6, 20) phone: string;
}

@InputType()
export class SetTurnOrderInput {
  @Field(() => ID) @IsUUID() groupId: string;

  @Field(() => [ID], {
    description: 'userId de TODOS los miembros, en orden de turno',
  })
  @IsArray()
  @ArrayMinSize(2)
  @ArrayMaxSize(20)
  @IsUUID('all', { each: true })
  userIds: string[];
}

@InputType()
export class PayArrearsInput {
  @Field(() => ID) @IsUUID() groupId: string;

  @Field(() => Int, { description: 'Número de la ronda original de la deuda' })
  @IsInt()
  @Min(1)
  round: number;

  @Field(() => String, {
    nullable: true,
    description: 'USDC; si se omite, paga el saldo completo',
  })
  @IsOptional()
  @Matches(USDC_REGEX, { message: 'amountUsdc inválido' })
  amountUsdc?: string;
}

@InputType()
export class UpdateGroupInput {
  @Field(() => ID) @IsUUID() groupId: string;
  @Field(() => String, { nullable: true })
  @IsOptional()
  @IsString()
  @Length(3, 120)
  name?: string;
  @Field(() => String, { nullable: true })
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  description?: string;
}
