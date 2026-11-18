import { Field, ID, Int, ObjectType } from '@nestjs/graphql';
import {
  Column,
  CreateDateColumn,
  Entity,
  OneToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
  type Relation,
} from 'typeorm';
import { KycStatus } from '../../common/enums/index.js';
import type { GroupMember } from '../../groups/entities/group-member.entity.js';
import type { PasanakuGroup } from '../../groups/entities/pasanaku-group.entity.js';
import type { Notification } from '../../notifications/entities/notification.entity.js';
import type { Transaction } from '../../transactions/entities/transaction.entity.js';
import type { UserReference } from './user-reference.entity.js';

/**
 * Vista GraphQL del propio usuario (`me`, respuesta de register/login).
 * REGLA: passwordHash, encryptedPrivateKey, encryptedCi, ciHash y kycProviderRef
 * NUNCA llevan @Field().
 */
@ObjectType('User')
@Entity('users')
export class User {
  @Field(() => ID)
  @PrimaryGeneratedColumn('uuid')
  id: string;

  /** E.164, ej. +59171234567 */
  @Field()
  @Column({ type: 'varchar', length: 20, unique: true })
  phone: string;

  @Field(() => String, { nullable: true })
  @Column({ type: 'varchar', length: 254, unique: true, nullable: true })
  email: string | null;

  @Column({ type: 'varchar', length: 255, select: false })
  passwordHash: string;

  @Field()
  @Column({ type: 'varchar', length: 160 })
  fullName: string;

  // CI normalizado y cifrado (AES-256-GCM). No exponer ni loguear.
  @Column({ type: 'text', nullable: true, select: false })
  encryptedCi: string | null;

  // HMAC determinístico del CI normalizado, para unicidad/búsqueda.
  @Column({
    type: 'varchar',
    length: 128,
    nullable: true,
    unique: true,
    select: false,
  })
  ciHash: string | null;

  @Field(() => KycStatus)
  @Column({
    type: 'enum',
    enum: KycStatus,
    enumName: 'kyc_status_enum',
    default: KycStatus.PENDING,
  })
  kycStatus: KycStatus;

  @Column({ type: 'varchar', length: 160, nullable: true })
  kycProviderRef: string | null;

  @Field()
  @Column({ type: 'varchar', length: 56, unique: true })
  stellarPublicKey: string;

  @Column({ type: 'text', select: false })
  encryptedPrivateKey: string;

  @Field(() => Int)
  @Column({ type: 'int', default: 100 })
  reputationScore: number;

  @Field(() => Int)
  @Column({ type: 'int', default: 0 })
  completedGroups: number;

  @Field(() => Int)
  @Column({ type: 'int', default: 0 })
  defaultCount: number;

  @Field(() => Date)
  @CreateDateColumn({ type: 'timestamptz' })
  createdAt: Date;

  @Field(() => Date)
  @UpdateDateColumn({ type: 'timestamptz' })
  updatedAt: Date;

  @OneToMany('UserReference', 'requester')
  referencesCreated: Relation<UserReference>[];

  @OneToMany('UserReference', 'contactUser')
  referencesReceived: Relation<UserReference>[];

  @OneToMany('GroupMember', 'user')
  memberships: Relation<GroupMember>[];

  @OneToMany('PasanakuGroup', 'creator')
  createdGroups: Relation<PasanakuGroup>[];

  @OneToMany('Transaction', 'user')
  transactions: Relation<Transaction>[];

  @OneToMany('Notification', 'user')
  notifications: Relation<Notification>[];
}
