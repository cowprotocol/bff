import { Column, Entity, PrimaryColumn } from 'typeorm';
import {
  bigIntToString,
  bufferToString,
  stringToBigInt,
  stringToBuffer,
} from '../utils/transformers';

@Entity({ name: 'trades' })
export class Trade {
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
    name: 'order_uid',
    transformer: { from: bufferToString, to: stringToBuffer },
  })
  orderUid: string;

  @Column('numeric', { name: 'sell_amount' })
  sellAmount: string;
}
