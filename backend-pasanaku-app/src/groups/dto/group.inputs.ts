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
  @IsString({ message: 'name debe ser un string' })
  @Length(3, 120, { message: 'name debe tener entre 3 y 120 caracteres' })
  name: string;

  @Field(() => String, { nullable: true })
  @IsOptional()
  @IsString({ message: 'description debe ser un string' })
  @MaxLength(1000, {
    message: 'description no debe exceder los 1000 caracteres',
  })
  description?: string;

  @Field(() => String, { description: 'Cuota en USDC, p. ej. "25" o "12.5"' })
  @Matches(USDC_REGEX, {
    message: 'contributionUsdc debe ser un número con hasta 7 decimales.',
  })
  contributionUsdc: string;

  @Field(() => Int)
  @IsInt({ message: 'maxParticipants debe ser un número entero' })
  @Min(2, { message: 'maxParticipants debe ser al menos 2' })
  @Max(20, { message: 'maxParticipants no debe exceder 20' })
  maxParticipants: number;

  @Field(() => Frequency)
  @IsEnum(Frequency)
  frequency: Frequency;

  @Field(() => Boolean, { defaultValue: true })
  @IsBoolean({ message: 'isPublic debe ser un booleano' })
  isPublic: boolean;

  @Field(() => Int, { nullable: true, description: 'Solo Testnet/demo' })
  @IsOptional()
  @IsInt({ message: 'roundDurationSeconds debe ser un número entero' })
  @Min(60, { message: 'roundDurationSeconds debe ser al menos 60' })
  roundDurationSeconds?: number;

  @Field(() => Int, { nullable: true, description: 'Solo Testnet/demo' })
  @IsOptional()
  @IsInt({ message: 'graceDurationSeconds debe ser un número entero' })
  @Min(30, { message: 'graceDurationSeconds debe ser al menos 30' })
  graceDurationSeconds?: number;
}

@InputType()
export class InviteMemberInput {
  @Field(() => ID)
  @IsUUID(undefined, { message: 'groupId debe ser un UUID válido' })
  groupId: string;

  @Field(() => String)
  @IsString({ message: 'phone debe ser un string' })
  @Length(6, 20, { message: 'phone debe tener entre 6 y 20 caracteres' })
  phone: string;
}

@InputType()
export class SetTurnOrderInput {
  @Field(() => ID)
  @IsUUID(undefined, { message: 'groupId debe ser un UUID válido' })
  groupId: string;

  @Field(() => [ID], {
    description: 'userId de TODOS los miembros, en orden de turno',
  })
  @IsArray({ message: 'userIds debe ser un arreglo de UUIDs' })
  @ArrayMinSize(2, { message: 'userIds debe tener al menos 2 elementos' })
  @ArrayMaxSize(20, { message: 'userIds no debe exceder 20 elementos' })
  @IsUUID('all', { each: true, message: 'Cada userId debe ser un UUID válido' })
  userIds: string[];
}

@InputType()
export class PayArrearsInput {
  @Field(() => ID)
  @IsUUID(undefined, { message: 'groupId debe ser un UUID válido' })
  groupId: string;

  @Field(() => Int, { description: 'Número de la ronda original de la deuda' })
  @IsInt({ message: 'round debe ser un número entero' })
  @Min(1, { message: 'round debe ser al menos 1' })
  round: number;

  @Field(() => String, {
    nullable: true,
    description: 'USDC; si se omite, paga el saldo completo',
  })
  @IsOptional()
  @Matches(USDC_REGEX, { message: 'amountUsdc debe ser un número con hasta 7 decimales.' })
  amountUsdc?: string;
}

@InputType()
export class UpdateGroupInput {
  @Field(() => ID)
  @IsUUID(undefined, { message: 'groupId debe ser un UUID válido' })
  groupId: string;

  @Field(() => String, { nullable: true })
  @IsOptional()
  @IsString({ message: 'name debe ser un string' })
  @Length(3, 120, { message: 'name debe tener entre 3 y 120 caracteres' })
  name?: string;

  @Field(() => String, { nullable: true })
  @IsOptional()
  @IsString({ message: 'description debe ser un string' })
  @MaxLength(1000, { message: 'description no debe exceder 1000 caracteres' })
  description?: string;
}
