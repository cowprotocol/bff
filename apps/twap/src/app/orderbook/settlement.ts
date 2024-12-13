import { Column, PrimaryColumn, Entity } from 'typeorm';
import {
  bigIntToString,
  bufferToString,
  stringToBigInt,
  stringToBuffer,
} from '@cowprotocol/shared';

@Entity({ name: 'settlements' })
export class Settlement {
  @PrimaryColumn('bigint', {
    name: 'block_number',
    transformer: { from: stringToBigInt, to: bigIntToString },
  })
  blockNumber: bigint;

  @PrimaryColumn('bigint', {
    name: 'log_index',
    transformer: { from: stringToBigInt, to: bigIntToString },
  })
  logIndex: bigint;

  @Column('bytea', {
    transformer: { from: bufferToString, to: stringToBuffer },
  })
  solver: string;

  @Column('bytea', {
    name: 'tx_hash',
    transformer: { from: bufferToString, to: stringToBuffer },
  })
  txHash: string;

  @Column('bytea', {
    name: 'tx_from',
    transformer: { from: bufferToString, to: stringToBuffer },
  })
  txFrom: string;

  @Column('bigint', {
    name: 'tx_nonce',
    transformer: { from: stringToBigInt, to: bigIntToString },
  })
  txNonce: bigint;
}
