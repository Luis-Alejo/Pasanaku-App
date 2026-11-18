import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  type Relation,
} from 'typeorm';
import { RoundPaymentStatus } from '../../common/enums/index.js';
import type { Round } from './round.entity.js';
import type { GroupMember } from './group-member.entity.js';
import type { Transaction } from '../../transactions/entities/transaction.entity.js';

@Entity('round_payments')
@Index('UQ_round_payments_round_member', ['roundId', 'memberId'], {
  unique: true,
})
export class RoundPayment {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  roundId: string;

  @Column({ type: 'uuid' })
  memberId: string;

  @Column({
    type: 'enum',
    enum: RoundPaymentStatus,
    enumName: 'round_payment_status_enum',
    default: RoundPaymentStatus.PENDING,
  })
  status: RoundPaymentStatus;

  @Column({ type: 'uuid', nullable: true })
  transactionId: string | null;

  @Column({ type: 'timestamptz', nullable: true })
  paidAt: Date | null;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt: Date;

  @ManyToOne('Round', 'payments', { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'roundId' })
  round: Relation<Round>;

  @ManyToOne('GroupMember', 'roundPayments', { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'memberId' })
  member: Relation<GroupMember>;

  @ManyToOne('Transaction', { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'transactionId' })
  transaction: Relation<Transaction> | null;
}
