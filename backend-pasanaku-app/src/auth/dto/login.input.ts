import { Field, InputType } from '@nestjs/graphql';
import { IsString, MaxLength } from 'class-validator';

@InputType()
export class LoginInput {
  @Field()
  @IsString({ message: 'phone debe ser un texto' })
  @MaxLength(30, { message: 'phone no puede exceder los 30 caracteres' })
  phone: string;

  @Field()
  @IsString({ message: 'password debe ser un texto' })
  @MaxLength(72, { message: 'password no puede exceder los 72 caracteres' })
  password: string;
}
