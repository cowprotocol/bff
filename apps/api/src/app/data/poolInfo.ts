import {
  Column,
  Entity,
  PrimaryColumn
} from 'typeorm';
import { bufferToString, stringToBuffer } from '@cowprotocol/shared';

@Entity({ name: 'cow_amm_competitor_info', schema: 'public' })
export class PoolInfo {
  @PrimaryColumn('bytea', {
    transformer: { from: bufferToString, to: stringToBuffer },
  })
  contract_address: string;

  @Column('int')
  chain_id: number;

  @Column('varchar')
  project: string;

  @Column('double precision')
  apr: number;

  @Column('double precision')
  fee: number;

  @Column('double precision')
  tvl: number;

  @Column('double precision')
  volume: number;
}
