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
  UpdateDateColumn,
  type Relation,
} from 'typeorm';
import { Frequency, GroupStatus } from '../../common/enums/index.js';
import { User } from '../../users/index.js';
import { GroupMember } from './group-member.entity.js';
import { Round } from './round.entity.js';
import { Transaction } from '../../transactions/entities/transaction.entity.js';
import { Notification } from '../../notifications/entities/notification.entity.js';

@Entity('pasanaku_groups')
@Index('UQ_pasanaku_groups_contract_address', ['contractAddress'], {
  unique: true,
})
@Index('UQ_pasanaku_groups_invite_code_hash', ['inviteCodeHash'], {
  unique: true,
})
@Index('IDX_pasanaku_groups_status_public', ['status', 'isPublic'])
@Check(
  'CHK_pasanaku_groups_max_participants',
  '"maxParticipants" BETWEEN 2 AND 20',
)
@Check('CHK_pasanaku_groups_positive_contribution', '"contributionStroops" > 0')
export class PasanakuGroup {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 120 })
  name: string;

  @Column({ type: 'text', nullable: true })
  description: string | null;

  @Column({ type: 'varchar', length: 128, nullable: true, select: false })
  inviteCodeHash: string | null;

  @Column({ type: 'boolean', default: true })
  isPublic: boolean;

  @Column({ type: 'uuid' })
  creatorId: string;

  @Column({ type: 'varchar', length: 56, nullable: true })
  contractAddress: string | null;

  @Column({ type: 'varchar', length: 56 })
  registryAddress: string;

  @Column({ type: 'varchar', length: 56 })
  adminServerAddress: string;

  @Column({ type: 'bigint' })
  contributionStroops: string;

  @Column({ type: 'bigint' })
  guaranteeStroops: string;

  @Column({ type: 'int', default: 20 })
  maxParticipants: number;

  @Column({ type: 'int' })
  roundDurationSeconds: number;

  @Column({ type: 'int', default: 259200 })
  graceDurationSeconds: number;

  @Column({ type: 'boolean', default: false })
  setupCompleted: boolean;

  @Column({
    type: 'enum',
    enum: Frequency,
    enumName: 'frequency_enum',
    default: Frequency.WEEKLY,
  })
  frequency: Frequency;

  @Column({ type: 'int', default: 80 })
  minReputationReq: number;

  @Column({
    type: 'enum',
    enum: GroupStatus,
    enumName: 'group_status_enum',
    default: GroupStatus.OPEN,
  })
  status: GroupStatus;

  @Column({ type: 'int', default: 0 })
  currentRound: number;

  @Column({ type: 'timestamptz', nullable: true })
  nextDeadline: Date | null;

  @Column({ type: 'timestamptz', nullable: true })
  graceDeadline: Date | null;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updatedAt: Date;

  @ManyToOne('User', 'createdGroups', { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'creatorId' })
  creator: Relation<User>;

  @OneToMany('GroupMember', 'group')
  members: Relation<GroupMember>[];

  @OneToMany('Round', 'group')
  rounds: Relation<Round>[];

  @OneToMany('Transaction', 'group')
  transactions: Relation<Transaction>[];

  @OneToMany('Notification', 'group')
  notifications: Relation<Notification>[];
}
