import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
  type Relation,
} from 'typeorm';
import type { PasanakuGroup } from './pasanaku-group.entity.js';
import type { GroupMember } from './group-member.entity.js';
import type { RoundPayment } from './round-payment.entity.js';
import type { Transaction } from '../../transactions/entities/transaction.entity.js';

@Entity('rounds')
@Index('UQ_rounds_group_number', ['groupId', 'roundNumber'], { unique: true })
export class Round {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  groupId: string;

  @Column({ type: 'int' })
  roundNumber: number;

  // Nullable hasta que el contrato/servicio determine el beneficiario de la ronda.
  @Column({ type: 'uuid', nullable: true })
  beneficiaryMemberId: string | null;

  @Column({ type: 'timestamptz' })
  deadline: Date;

  @Column({ type: 'timestamptz' })
  graceEnd: Date;

  @Column({ type: 'bigint' })
  expectedPoolStroops: string;

  @Column({ type: 'bigint', default: '0' })
  actualPayoutStroops: string;

  @Column({ type: 'boolean', default: false })
  isSettled: boolean;

  @Column({ type: 'varchar', length: 64, nullable: true, unique: true })
  settleTxHash: string | null;

  @Column({ type: 'timestamptz', nullable: true })
  settledAt: Date | null;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt: Date;

  @ManyToOne('PasanakuGroup', 'rounds', {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'groupId' })
  group: Relation<PasanakuGroup>;

  @ManyToOne('GroupMember', { nullable: true, onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'beneficiaryMemberId' })
  beneficiary: Relation<GroupMember> | null;

  @OneToMany('RoundPayment', 'round')
  payments: Relation<RoundPayment>[];

  @OneToMany('Transaction', 'round')
  transactions: Relation<Transaction>[];
}
