import { Field, ID, InputType } from '@nestjs/graphql';
import { IsBoolean, IsUUID } from 'class-validator';

@InputType()
export class RespondReferenceInput {
  @Field(() => ID)
  @IsUUID()
  referenceId: string;

  @Field()
  @IsBoolean()
  accept: boolean;
}
