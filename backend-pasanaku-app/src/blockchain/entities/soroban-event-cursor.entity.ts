import { Column, Entity, PrimaryColumn, UpdateDateColumn } from 'typeorm';

@Entity('soroban_event_cursors')
export class SorobanEventCursor {
  @PrimaryColumn({ type: 'varchar', length: 80 })
  id: string; // Ej. "pasanaku_events"

  @Column({ type: 'int', default: 0 })
  lastLedger: number;

  @Column({ type: 'text', nullable: true })
  pagingToken: string | null;

  @UpdateDateColumn({ type: 'timestamptz' })
  updatedAt: Date;
}
