import { Entity, ManyToOne, PrimaryColumn } from 'typeorm';
import { Order } from './order';

@Entity({ name: 'order_part' })
export class OrderPart {
  @PrimaryColumn('varchar')
  id: string;

  @ManyToOne(() => Order, (order) => order.parts)
  order: Order;
}
