import { Field, InputType } from '@nestjs/graphql';
import { IsString, Matches } from 'class-validator';

@InputType()
export class SubmitKycInput {
  /** CI boliviano, con complemento opcional (ej. 1234567 o 1234567-1A) */
  @Field()
  @IsString()
  @Matches(/^\d{5,10}([-\s]?[0-9A-Za-z]{1,2})?$/, {
    message: 'Número de CI inválido',
  })
  ciNumber: string;
}
