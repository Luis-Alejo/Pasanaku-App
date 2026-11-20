import { Field, ID, ObjectType } from '@nestjs/graphql';
import {
  Currency,
  TransactionStatus,
  TransactionType,
} from '../../common/enums/index.js';

/** No se llama `Transaction`/`TransactionType` para no chocar con la entidad ni con el enum. */
@ObjectType('TransactionRecord')
export class TransactionRecordType {
  @Field(() => ID) id: string;
  @Field(() => TransactionType) type: TransactionType;
  @Field(() => TransactionStatus) status: TransactionStatus;
  @Field(() => ID) userId: string;
  @Field(() => String, { nullable: true }) userFullName: string | null;
  @Field(() => ID, { nullable: true }) groupId: string | null;
  @Field(() => ID, { nullable: true }) roundId: string | null;
  @Field(() => String) amountStroops: string;
  /** Solo visibles para el dueño de la operación (nunca en el historial del grupo). */
  @Field(() => Currency, { nullable: true }) fiatCurrency: Currency | null;
  @Field(() => String, { nullable: true }) fiatAmount: string | null;
  @Field(() => String, { nullable: true }) exchangeRate: string | null;
  /** Hash verificable en el explorador de Stellar. */
  @Field(() => String, { nullable: true }) stellarTxHash: string | null;
  @Field(() => Date) createdAt: Date;
  @Field(() => Date) updatedAt: Date;
}

export const PAGE_MAX = 50;
export const clampPage = (limit: number, offset: number) => ({
  take: Math.min(Math.max(Math.trunc(limit) || 20, 1), PAGE_MAX),
  skip: Math.max(Math.trunc(offset) || 0, 0),
});
