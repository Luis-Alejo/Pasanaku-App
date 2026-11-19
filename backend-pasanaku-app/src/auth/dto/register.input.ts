import { Field, InputType } from '@nestjs/graphql';
import {
  IsEmail,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
  MinLength,
} from 'class-validator';

@InputType()
export class RegisterInput {
  @Field()
  @IsString()
  @MinLength(2)
  @MaxLength(160)
  fullName: string;

  @Field()
  @IsString()
  @Matches(/^\+?[\d\s\-().]{8,20}$/, { message: 'Celular inválido' })
  phone: string;

  // bcrypt ignora todo lo que pase de 72 bytes
  @Field()
  @IsString()
  @MinLength(8)
  @MaxLength(72)
  password: string;

  @Field({ nullable: true })
  @IsOptional()
  @IsEmail()
  @MaxLength(254)
  email?: string;
}
