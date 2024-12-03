import { Column, PrimaryColumn, Entity } from 'typeorm';
import {
  bigIntToString,
  bufferToString,
  stringToBigInt,
  stringToBuffer,
} from '@cowprotocol/shared';

@Entity({ name: 'orders' })
export class Order {
  @PrimaryColumn('bytea', {
    name: 'uid',
    transformer: { from: bufferToString, to: stringToBuffer },
  })
  uid: string;

  @Column('bytea', {
    name: 'owner',
    transformer: { from: bufferToString, to: stringToBuffer },
  })
  owner: string;

  @Column('timestamp with time zone', { name: 'creation_timestamp' })
  creationTimestamp: Date;

  @Column('bytea', {
    name: 'sell_token',
    transformer: { from: bufferToString, to: stringToBuffer },
  })
  sellToken: string;

  @Column('bytea', {
    name: 'buy_token',
    transformer: { from: bufferToString, to: stringToBuffer },
  })
  buyToken: string;

  @Column('numeric', { name: 'sell_amount' })
  sellAmount: number;

  @Column('numeric', { name: 'buy_amount' })
  buyAmount: number;

  @Column('bigint', {
    name: 'valid_to',
    transformer: { from: stringToBigInt, to: bigIntToString },
  })
  validTo: bigint;

  @Column('numeric', { name: 'fee_amount' })
  feeAmount: number;

  @Column('enum', {
    name: 'kind',
    enumName: 'orderkind',
    enum: ['sell', 'buy'],
  })
  kind: 'sell' | 'buy';

  @Column('boolean', { name: 'partially_fillable' })
  partiallyFillable: boolean;

  @Column('bytea', {
    name: 'signature',
    transformer: { from: bufferToString, to: stringToBuffer },
  })
  signature: string;

  @Column('timestamp with time zone', { name: 'cancellation_timestamp' })
  cancellationTimestamp: Date;

  @Column('bytea', {
    name: 'receiver',
    transformer: { from: bufferToString, to: stringToBuffer },
  })
  receiver: string;

  @Column('bytea', {
    name: 'app_data',
    transformer: { from: bufferToString, to: stringToBuffer },
  })
  appData: string;

  @Column('enum', {
    name: 'signing_scheme',
    enumName: 'signingscheme',
    enum: ['presign', 'eip712', 'eip1271', 'ethsign'],
  })
  signingScheme: 'presign' | 'eip712' | 'eip1271' | 'ethsign';

  @Column('bytea', {
    name: 'settlement_contract',
    transformer: { from: bufferToString, to: stringToBuffer },
  })
  settlementContract: string;

  @Column('enum', {
    name: 'sell_token_balance',
    enumName: 'selltokensource',
    enum: ['erc20', 'internal', 'external'],
  })
  sellTokenBalance: 'erc20' | 'internal' | 'external';

  @Column('enum', {
    name: 'buy_token_balance',
    enumName: 'buytokendestination',
    enum: ['erc20', 'internal'],
  })
  buyTokenBalance: 'erc20' | 'internal';

  @Column('numeric', { name: 'full_fee_amount' })
  fullFeeAmount: number;

  @Column('enum', {
    name: 'class',
    enumName: 'orderclass',
    enum: ['market', 'liquidity', 'limit'],
  })
  class: 'market' | 'liquidity' | 'limit';

  @Column('numeric', { name: 'surplus_fee' })
  surplusFee: number;

  @Column('timestamp with time zone', { name: 'surplus_fee_timestamp' })
  surplusFeeTimestamp: Date;
}
