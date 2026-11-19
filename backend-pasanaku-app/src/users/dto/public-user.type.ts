import { Field, ID, ObjectType } from '@nestjs/graphql';

/** Datos mínimos de otro usuario (nunca email, wallet ni KYC). */
@ObjectType('PublicUser')
export class PublicUserType {
  @Field(() => ID)
  id: string;

  @Field()
  fullName: string;

  @Field()
  phone: string;
}
