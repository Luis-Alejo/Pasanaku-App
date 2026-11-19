import { Field, ObjectType } from '@nestjs/graphql';
import { User } from '../../users/entities/user.entity.js';

@ObjectType('AuthPayload')
export class AuthPayload {
  @Field()
  accessToken: string;

  @Field(() => User)
  user: User;
}
