import { Field, InputType } from '@nestjs/graphql';
import { IsEnum, IsOptional, IsString, Matches } from 'class-validator';
import { ReferenceRelationship } from '../../common/enums/index.js';

/** Debe indicarse exactamente uno: contactPhone o contactCi. */
@InputType()
export class RequestReferenceInput {
  @Field({ nullable: true })
  @IsOptional()
  @IsString()
  @Matches(/^\+?[\d\s\-().]{8,20}$/, { message: 'Celular inválido' })
  contactPhone?: string;

  @Field({ nullable: true })
  @IsOptional()
  @IsString()
  @Matches(/^\d{5,10}([-\s]?[0-9A-Za-z]{1,2})?$/, {
    message: 'Número de CI inválido',
  })
  contactCi?: string;

  @Field(() => ReferenceRelationship)
  @IsEnum(ReferenceRelationship)
  relationship: ReferenceRelationship;
}
