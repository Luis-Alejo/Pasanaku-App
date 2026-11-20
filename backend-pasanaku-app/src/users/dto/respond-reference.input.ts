import { Field, ID, InputType } from '@nestjs/graphql';
import { IsBoolean, IsUUID } from 'class-validator';

@InputType()
export class RespondReferenceInput {
  @Field(() => ID)
  @IsUUID(undefined, { message: 'referenceId debe ser un UUID válido' })
  referenceId: string;

  @Field()
  @IsBoolean({ message: 'accept debe ser un valor booleano' })
  accept: boolean;
}
