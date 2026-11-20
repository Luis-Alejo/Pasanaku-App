import { Global, Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { WATCHED_CONTRACTS_PORT } from '../blockchain/indexer/watched-contracts.port.js';
import { GROUP_OBLIGATIONS_PORT } from '../users/ports/group-obligations.port.js';
import { UsersModule } from '../users/users.module.js';
import { GroupMember } from './entities/group-member.entity.js';
import { MemberDebt } from './entities/member-debt.entity.js';
import { PasanakuGroup } from './entities/pasanaku-group.entity.js';
import { RoundPayment } from './entities/round-payment.entity.js';
import { Round } from './entities/round.entity.js';
import { GroupEventsListener } from './group-events.listener.js';
import { GroupObligationsService } from './group-obligations.service.js';
import { GroupsResolver } from './groups.resolver.js';
import { GroupsService } from './groups.service.js';
import { WatchedContractsProvider } from './watched-contracts.provider.js';
import { GroupInvitation } from './entities/group-invitation.entity.js';
import { TransactionsModule } from '../transactions/transactions.module.js';

@Global()
@Module({
  imports: [
    TypeOrmModule.forFeature([
      PasanakuGroup,
      GroupMember,
      Round,
      RoundPayment,
      MemberDebt,
      GroupInvitation,
    ]),
    TransactionsModule,
    UsersModule,
  ],
  providers: [
    GroupsService,
    GroupsResolver,
    GroupEventsListener,
    GroupObligationsService,
    WatchedContractsProvider,
    { provide: GROUP_OBLIGATIONS_PORT, useExisting: GroupObligationsService },
    { provide: WATCHED_CONTRACTS_PORT, useExisting: WatchedContractsProvider },
  ],
  exports: [GroupsService, GROUP_OBLIGATIONS_PORT, WATCHED_CONTRACTS_PORT],
})
export class GroupsModule {}
