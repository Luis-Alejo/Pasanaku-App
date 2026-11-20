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
  @IsString({ message: 'fullName debe ser un texto' })
  @MinLength(2, {
    message: 'fullName debe tener al menos 2 caracteres',
  })
  @MaxLength(160, {
    message: 'fullName no puede exceder los 160 caracteres',
  })
  fullName: string;

  @Field()
  @IsString({ message: 'phone debe ser un texto' })
  @Matches(/^\+?[\d\s\-().]{8,20}$/, { message: 'phone inválido' })
  phone: string;

  // bcrypt ignora todo lo que pase de 72 bytes
  @Field()
  @IsString({ message: 'password debe ser un texto' })
  @MinLength(8, { message: 'password debe tener al menos 8 caracteres' })
  @MaxLength(72, {
    message: 'password no puede exceder los 72 caracteres',
  })
  password: string;

  @Field({ nullable: true })
  @IsOptional()
  @IsEmail({}, { message: 'email no es válido' })
  @MaxLength(254, {
    message: 'email no puede exceder los 254 caracteres',
  })
  email?: string;
}
