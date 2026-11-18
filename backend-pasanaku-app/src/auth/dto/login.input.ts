import { Field, InputType } from '@nestjs/graphql';
import { IsString, MaxLength } from 'class-validator';

@InputType()
export class LoginInput {
  @Field()
  @IsString()
  @MaxLength(30)
  phone: string;

  @Field()
  @IsString()
  @MaxLength(72)
  password: string;
}
