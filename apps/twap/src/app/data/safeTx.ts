import { Column, Entity, PrimaryColumn } from 'typeorm';

@Entity({ name: 'safe_tx' })
export class SafeTx {
  @PrimaryColumn('varchar')
  safeTxHash: string;

  @Column('int')
  nonce: number;
}
