import {
  BeforeInsert,
  Column,
  Entity,
  ManyToOne,
  PrimaryColumn,
} from 'typeorm';
import { Wallet } from './wallet';
import {
  buildTwapOrderParamsStruct,
  getConditionalOrderId,
} from '../utils/getConditionalOrderId';

@Entity({ name: 'order' })
export class Order {
  @PrimaryColumn('varchar')
  id: string;

  @BeforeInsert()
  createOrderId() {
    console.log({
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
    });
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

  @Column('varchar')
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
}
