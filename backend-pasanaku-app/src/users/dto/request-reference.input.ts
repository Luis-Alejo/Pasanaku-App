import { Field, InputType } from '@nestjs/graphql';
import { IsEnum, IsOptional, IsString, Matches } from 'class-validator';
import { ReferenceRelationship } from '../../common/enums/index.js';

/** Debe indicarse exactamente uno: contactPhone o contactCi. */
@InputType()
export class RequestReferenceInput {
  @Field({ nullable: true })
  @IsOptional()
  @IsString({ message: 'contactPhone debe ser un texto' })
  @Matches(/^\+?[\d\s\-().]{8,20}$/, { message: 'contactPhone inválido' })
  contactPhone?: string;

  @Field({ nullable: true })
  @IsOptional()
  @IsString({ message: 'contactCi debe ser un texto' })
  @Matches(/^\d{5,10}([-\s]?[0-9A-Za-z]{1,2})?$/, {
    message: 'contactCi inválido',
  })
  contactCi?: string;

  @Field(() => ReferenceRelationship)
  @IsEnum(ReferenceRelationship, { message: 'Relación inválida' })
  relationship: ReferenceRelationship;
}
