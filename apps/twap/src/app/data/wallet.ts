import { Entity, OneToMany, PrimaryColumn } from 'typeorm';
import { Order } from './order';

@Entity({ name: 'wallet' })
export class Wallet {
  @PrimaryColumn('varchar')
  address: string;

  @OneToMany(() => Order, (order) => order.wallet, {
    createForeignKeyConstraints: true,
  })
  orders: Order[];
}
