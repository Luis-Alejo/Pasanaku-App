import { Field, ID, Int, ObjectType } from '@nestjs/graphql';

/** Datos mínimos de otro usuario (nunca email, wallet ni KYC). */
@ObjectType('PublicUser')
export class PublicUserType {
  @Field(() => ID)
  id: string;

  @Field()
  fullName: string;

  @Field()
  phone: string;

  @Field(() => Int)
  reputationScore: number;

  @Field(() => Int)
  completedGroups: number;

  @Field(() => Int)
  defaultCount: number;
}
