import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { GroupMember } from '../groups/entities/group-member.entity.js';
import { PasanakuGroup } from '../groups/entities/pasanaku-group.entity.js';
import { Transaction } from './entities/transaction.entity.js';
import { TransactionsEventsListener } from './transactions-events.listener.js';
import { TransactionsResolver } from './transactions.resolver.js';
import { TransactionsService } from './transactions.service.js';

@Module({
  imports: [
    TypeOrmModule.forFeature([Transaction, GroupMember, PasanakuGroup]),
  ],
  providers: [
    TransactionsService,
    TransactionsResolver,
    TransactionsEventsListener,
  ],
  exports: [TransactionsService],
})
export class TransactionsModule {}
