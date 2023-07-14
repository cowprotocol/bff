import { Entity, PrimaryColumn } from 'typeorm';

@Entity({ name: 'block' })
export class Block {
  @PrimaryColumn('int')
  blockNumber: number;

  @PrimaryColumn('int')
  chainId: number;
}
