import {
  Column,
  Entity,
  PrimaryColumn,
  CreateDateColumn,
  UpdateDateColumn,
  Unique,
} from 'typeorm';

@Entity({ name: 'indexer_state' })
@Unique(['key', 'chainId'])
export class IndexerState {
  @PrimaryColumn('text')
  key!: string;

  @Column('integer', { nullable: true })
  chainId!: number | null;

  @Column('jsonb')
  state!: Record<string, unknown>;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt!: Date;
}
