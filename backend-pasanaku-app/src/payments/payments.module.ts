import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { GroupMember } from '../groups/entities/group-member.entity.js';
import { MemberDebt } from '../groups/entities/member-debt.entity.js';
import { PasanakuGroup } from '../groups/entities/pasanaku-group.entity.js';
import { Round } from '../groups/entities/round.entity.js';
import { TransactionsModule } from '../transactions/transactions.module.js';
import { UsersModule } from '../users/users.module.js';
import { PaymentsResolver } from './payments.resolver.js';
import { PaymentsService } from './payments.service.js';
import { PollarWebhookController } from './pollar-webhook.controller.js';
import { PollarService } from './pollar.service.js';

// GroupsService llega por GroupsModule (@Global). Si JwtAuthGuard no resuelve JwtService aquí,
// importa lo mismo que ya importas en GroupsModule (AuthModule/JwtModule).
@Module({
  imports: [
    TypeOrmModule.forFeature([PasanakuGroup, GroupMember, Round, MemberDebt]),
    TransactionsModule,
    UsersModule,
  ],
  controllers: [PollarWebhookController],
  providers: [PollarService, PaymentsService, PaymentsResolver],
  exports: [PaymentsService],
})
export class PaymentsModule {}
