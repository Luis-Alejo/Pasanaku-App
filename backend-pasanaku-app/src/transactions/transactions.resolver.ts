import { ParseUUIDPipe, UseGuards } from '@nestjs/common';
import { Args, ID, Int, Query, Resolver } from '@nestjs/graphql';
import { CurrentUser } from '../common/decorators/current-user.decorator.js';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard.js';
import { TransactionRecordType } from './dto/transaction.types.js';
import { TransactionsService } from './transactions.service.js';

@Resolver()
@UseGuards(JwtAuthGuard)
export class TransactionsResolver {
  constructor(private readonly transactions: TransactionsService) {}

  @Query(() => [TransactionRecordType])
  myTransactions(
    @CurrentUser('id') userId: string,
    @Args('limit', { type: () => Int, defaultValue: 20 }) limit: number,
    @Args('offset', { type: () => Int, defaultValue: 0 }) offset: number,
  ) {
    return this.transactions.myTransactions(userId, limit, offset);
  }

  @Query(() => [TransactionRecordType])
  groupTransactions(
    @CurrentUser('id') userId: string,
    @Args('groupId', { type: () => ID }, ParseUUIDPipe) groupId: string,
    @Args('limit', { type: () => Int, defaultValue: 20 }) limit: number,
    @Args('offset', { type: () => Int, defaultValue: 0 }) offset: number,
  ) {
    return this.transactions.groupTransactions(groupId, userId, limit, offset);
  }
}
