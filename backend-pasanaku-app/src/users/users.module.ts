import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { UserReference } from './entities/user-reference.entity.js';
import { User } from './entities/user.entity.js';
import { UserWalletService } from './user-wallet.service.js';
import { UsersResolver } from './users.resolver.js';
import { UsersService } from './users.service.js';
import { UserReputationListener } from './user-reputation.listener.js';

/**
 * Requiere (globales) los providers WALLET_KEY_GENERATOR (blockchain/)
 * y, opcionalmente, GROUP_OBLIGATIONS_PORT (groups/). CryptoModule es @Global().
 */
@Module({
  imports: [TypeOrmModule.forFeature([User, UserReference])],
  providers: [UsersService, UserWalletService, UsersResolver, UserReputationListener],
  exports: [UsersService, UserWalletService],
})
export class UsersModule {}
