import {
  CreateDateColumn,
  Column,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  type Relation,
} from 'typeorm';
import type { User } from '../../users/entities/user.entity.js';
import type { PasanakuGroup } from './pasanaku-group.entity.js';

@Entity('group_invitations')
@Index('UQ_group_invitations_group_user', ['groupId', 'userId'], {
  unique: true,
})
export class GroupInvitation {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  groupId: string;

  @Column({ type: 'uuid' })
  userId: string;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt: Date;

  @ManyToOne('PasanakuGroup', { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'groupId' })
  group: Relation<PasanakuGroup>;

  @ManyToOne('User', { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'userId' })
  user: Relation<User>;
}
