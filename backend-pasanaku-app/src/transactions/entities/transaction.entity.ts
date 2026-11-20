import {
  Column, CreateDateColumn, Entity, Index, JoinColumn, ManyToOne,
  PrimaryGeneratedColumn, UpdateDateColumn, type Relation,
} from 'typeorm';
import { Currency, TransactionStatus, TransactionType } from '../../common/enums/index.js';
import type { User } from '../../users/entities/user.entity.js';
import type { PasanakuGroup } from '../../groups/entities/pasanaku-group.entity.js';
import type { Round } from '../../groups/entities/round.entity.js';

@Entity('transactions')
@Index('UQ_transactions_idempotency_key', ['idempotencyKey'], { unique: true })
@Index('UQ_transactions_stellar_hash', ['stellarTxHash', 'userId', 'type'], { unique: true })
@Index('UQ_transactions_pollar_reference', ['pollarReference'], { unique: true })
export class Transaction {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  userId: string;

  @Column({ type: 'uuid', nullable: true })
  groupId: string | null;

  @Column({ type: 'uuid', nullable: true })
  roundId: string | null;

  @Column({ type: 'enum', enum: TransactionType, enumName: 'transaction_type_enum' })
  type: TransactionType;

  @Column({ type: 'enum', enum: TransactionStatus, enumName: 'transaction_status_enum', default: TransactionStatus.PENDING_FIAT })
  status: TransactionStatus;

  @Column({ type: 'varchar', length: 128, unique: true })
  idempotencyKey: string;

  @Column({ type: 'bigint' })
  amountStroops: string;

  @Column({ type: 'enum', enum: Currency, enumName: 'currency_enum', default: Currency.BOB })
  fiatCurrency: Currency;

  @Column({ type: 'decimal', precision: 12, scale: 2, nullable: true })
  fiatAmount: string | null;

  @Column({ type: 'decimal', precision: 10, scale: 4, nullable: true })
  exchangeRate: string | null;

  @Column({ type: 'varchar', length: 160, nullable: true, unique: true })
  pollarReference: string | null;

  @Column({ type: 'varchar', length: 64, nullable: true })
  stellarTxHash: string | null;

  @Column({ type: 'boolean', default: true })
  feeSponsored: boolean;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updatedAt: Date;

  @ManyToOne('User', 'transactions', { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'userId' })
  user: Relation<User>;

  @ManyToOne('PasanakuGroup', 'transactions', { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'groupId' })
  group: Relation<PasanakuGroup> | null;

  @ManyToOne('Round', 'transactions', { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'roundId' })
  round: Relation<Round> | null;
}
