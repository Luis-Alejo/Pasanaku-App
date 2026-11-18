import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CryptoService } from '../common/crypto/crypto.service.js';
import {
  WALLET_KEY_GENERATOR,
  type WalletKeyGenerator,
} from './ports/wallet-key-generator.port.js';
import { User } from './entities/user.entity.js';

export interface CustodialWallet {
  stellarPublicKey: string;
  encryptedPrivateKey: string;
}

/**
 * Solo genera y cifra el keypair. La cuenta NO existe on-chain hasta que
 * blockchain/ la fondee y cree la trustline USDC (fuera del alcance de users/).
 */
@Injectable()
export class UserWalletService {
  constructor(
    private readonly crypto: CryptoService,
    @Inject(WALLET_KEY_GENERATOR)
    private readonly keyGenerator: WalletKeyGenerator,
    @InjectRepository(User)
    private readonly usersRepo: Repository<User>,
  ) {}

  async createCustodialWallet(): Promise<CustodialWallet> {
    const { publicKey, secret } = await this.keyGenerator.generateKeypair();
    return {
      stellarPublicKey: publicKey,
      encryptedPrivateKey: this.crypto.encrypt(secret),
    };
  }

  /** Solo para uso interno (firmar en blockchain/). Nunca loguear ni exponer el resultado. */
  async getSecretKey(userId: string): Promise<string> {
    const user = await this.usersRepo
      .createQueryBuilder('user')
      .addSelect('user.encryptedPrivateKey')
      .where('user.id = :userId', { userId })
      .getOne();

    if (!user?.encryptedPrivateKey) {
      throw new NotFoundException('El usuario no tiene wallet custodial');
    }
    return this.crypto.decrypt(user.encryptedPrivateKey);
  }
}
