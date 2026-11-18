import { Field, ID, ObjectType } from '@nestjs/graphql';
import {
  Check,
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  type Relation,
} from 'typeorm';
import {
  ReferenceRelationship,
  ReferenceStatus,
} from '../../common/enums/index.js';
import { PublicUserType } from '../dto/public-user.type.js';
import type { User } from './user.entity.js';

/**
 * `requester` pide a `contactUser` que sea su referencia (contacto de confianza).
 * Los campos requester/contactUser se exponen como PublicUser (id, fullName, phone).
 */
@ObjectType('UserReference')
@Entity('user_references')
@Index('UQ_user_references_pair', ['requesterId', 'contactUserId'], {
  unique: true,
})
@Check('CHK_user_references_not_self', '"requesterId" <> "contactUserId"')
export class UserReference {
  @Field(() => ID)
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  requesterId: string;

  @Column({ type: 'uuid' })
  contactUserId: string;

  @Field(() => ReferenceRelationship)
  @Column({
    type: 'enum',
    enum: ReferenceRelationship,
    enumName: 'reference_relationship_enum',
  })
  relationship: ReferenceRelationship;

  @Field(() => ReferenceStatus)
  @Column({
    type: 'enum',
    enum: ReferenceStatus,
    enumName: 'reference_status_enum',
    default: ReferenceStatus.PENDING,
  })
  status: ReferenceStatus;

  @Field(() => Date)
  @CreateDateColumn({ type: 'timestamptz' })
  createdAt: Date;

  @Field(() => PublicUserType)
  @ManyToOne('User', 'referencesCreated', {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'requesterId' })
  requester: Relation<User>;

  @Field(() => PublicUserType)
  @ManyToOne('User', 'referencesReceived', {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'contactUserId' })
  contactUser: Relation<User>;
}
