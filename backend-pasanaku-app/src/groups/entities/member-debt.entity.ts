import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
  type Relation,
} from 'typeorm';
import { DebtStatus } from '../../common/enums/index.js';
import { PasanakuGroup } from './pasanaku-group.entity.js';
import { Round } from './round.entity.js';
import { GroupMember } from './group-member.entity.js';

@Entity('member_debts')
@Index('IDX_member_debts_group_status', ['groupId', 'status'])
@Index('UQ_member_debts_round_debtor', ['originalRoundId', 'debtorMemberId'], {
  unique: true,
})
export class MemberDebt {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  groupId: string;

  @Column({ type: 'uuid' })
  originalRoundId: string;

  @Column({ type: 'uuid' })
  debtorMemberId: string;

  @Column({ type: 'uuid' })
  beneficiaryMemberId: string;

  @Column({ type: 'bigint' })
  originalAmountStroops: string;

  @Column({ type: 'bigint' })
  remainingAmountStroops: string;

  @Column({ type: 'varchar', length: 64, nullable: true })
  lastPaymentTxHash: string | null;

  @Column({
    type: 'enum',
    enum: DebtStatus,
    enumName: 'debt_status_enum',
    default: DebtStatus.OPEN,
  })
  status: DebtStatus;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updatedAt: Date;

  @ManyToOne('PasanakuGroup', { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'groupId' })
  group: Relation<PasanakuGroup>;

  @ManyToOne('Round', { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'originalRoundId' })
  originalRound: Relation<Round>;

  @ManyToOne('GroupMember', 'debtsAsDebtor', {
    onDelete: 'RESTRICT',
  })
  @JoinColumn({ name: 'debtorMemberId' })
  debtorMember: Relation<GroupMember>;

  @ManyToOne('GroupMember', 'debtsAsBeneficiary', {
    onDelete: 'RESTRICT',
  })
  @JoinColumn({ name: 'beneficiaryMemberId' })
  beneficiaryMember: Relation<GroupMember>;
}
