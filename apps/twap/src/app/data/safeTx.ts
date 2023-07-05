import { Entity, PrimaryColumn } from 'typeorm';

@Entity({ name: 'safe_tx' })
export class SafeTx {
  @PrimaryColumn('varchar')
  safeTxHash: string;
}
