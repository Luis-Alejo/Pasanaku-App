import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
} from 'typeorm';

@Entity('processed_soroban_events')
@Index('UQ_processed_soroban_events_event_id', ['eventId'], { unique: true })
export class ProcessedSorobanEvent {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 160 })
  eventId: string;

  @Column({ type: 'varchar', length: 56 })
  contractAddress: string;

  @Column({ type: 'int' })
  ledger: number;

  @Column({ type: 'text', nullable: true })
  topic: string | null;

  @CreateDateColumn({ type: 'timestamptz' })
  processedAt: Date;
}
