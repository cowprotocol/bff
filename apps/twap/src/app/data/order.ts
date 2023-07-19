import {
  BeforeInsert,
  Column,
  Entity,
  ManyToOne,
  OneToMany,
  PrimaryColumn,
} from 'typeorm';
import { Wallet } from './wallet';
import {
  buildTwapOrderParamsStruct,
  getConditionalOrderId,
} from '../conditionalOrder/getConditionalOrderId';
import { OrderPart } from './orderPart';
import { AllOrderStatuses, OrderStatus } from '../types/order';
import { bigIntToString, stringToBigInt } from '../utils/transformers';

@Entity({ name: 'order' })
export class Order {
  @PrimaryColumn('varchar')
  id: string;

  @BeforeInsert()
  createOrderId() {
    this.id = getConditionalOrderId(
      buildTwapOrderParamsStruct(this.chainId, {
        sellToken: this.sellToken,
        buyToken: this.buyToken,
        receiver: this.receiver,
        partSellAmount: this.partSellAmount,
        minPartLimit: this.minPartLimit,
        t0: this.t0,
        n: this.n,
        t: this.t,
        span: this.span,
        appData: this.appData,
      })
    );
  }

  @ManyToOne(() => Wallet, (wallet) => wallet.orders, {
    cascade: true,
    createForeignKeyConstraints: true,
    eager: true,
  })
  wallet: Wallet;

  @Column('varchar')
  sellToken: string;

  @Column('varchar')
  buyToken: string;

  @Column('varchar')
  appData: string;

  @Column('varchar')
  receiver: string;

  @Column('int')
  chainId: number;

  @Column('varchar')
  partSellAmount: string;

  @Column('varchar')
  minPartLimit: string;

  @Column('int')
  t0: number;

  @Column('int')
  n: number;

  @Column('int')
  t: number;

  @Column('int')
  span: number;

  @Column('enum', {
    enum: AllOrderStatuses,
  })
  status: OrderStatus;

  @OneToMany(() => OrderPart, (orderPart) => orderPart.order, {
    cascade: true,
    eager: true,
  })
  parts: OrderPart[];

  @Column('numeric', {
    transformer: { from: stringToBigInt, to: bigIntToString },
    nullable: true,
  })
  executedBuyAmount: bigint;

  @Column('numeric', {
    transformer: { from: stringToBigInt, to: bigIntToString },
    nullable: true,
  })
  executedSellAmount: bigint;
}
