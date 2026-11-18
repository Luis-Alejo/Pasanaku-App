import {
  Check,
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
import { User } from '../../users/index.js';
import { PasanakuGroup } from './pasanaku-group.entity.js';
import { RoundPayment } from './round-payment.entity.js';
import { MemberDebt } from './member-debt.entity.js';

@Entity('group_members')
@Index('UQ_group_members_user_group', ['userId', 'groupId'], { unique: true })
@Index('UQ_group_members_initial_order', ['groupId', 'initialTurnOrder'], {
  unique: true,
})
@Index(
  'UQ_group_members_current_position',
  ['groupId', 'currentQueuePosition'],
  { unique: true },
)
@Check('CHK_group_members_initial_order_positive', '"initialTurnOrder" > 0')
@Check(
  'CHK_group_members_current_position_positive',
  '"currentQueuePosition" > 0',
)
export class GroupMember {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  userId: string;

  @Column({ type: 'uuid' })
  groupId: string;

  @Column({ type: 'int' })
  initialTurnOrder: number;

  @Column({ type: 'int' })
  currentQueuePosition: number;

  @Column({ type: 'boolean', default: false })
  hasReceivedPayout: boolean;

  @Column({ type: 'bigint', default: '0' })
  guaranteeBalanceStroops: string;

  @Column({ type: 'bigint', default: '0' })
  totalContributedStroops: string;

  @Column({ type: 'bigint', default: '0' })
  totalDebtStroops: string;

  @Column({ type: 'bigint', default: '0' })
  shortfallStroops: string;

  @Column({ type: 'boolean', default: true })
  isClean: boolean;

  @CreateDateColumn({ type: 'timestamptz' })
  joinedAt: Date;

  @ManyToOne('User', 'memberships', { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'userId' })
  user: Relation<User>;

  @ManyToOne('PasanakuGroup', 'members', {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'groupId' })
  group: Relation<PasanakuGroup>;

  @OneToMany('RoundPayment', 'member')
  roundPayments: Relation<RoundPayment>[];

  @OneToMany('MemberDebt', 'debtorMember')
  debtsAsDebtor: Relation<MemberDebt>[];

  @OneToMany('MemberDebt', 'beneficiaryMember')
  debtsAsBeneficiary: Relation<MemberDebt>[];
}
