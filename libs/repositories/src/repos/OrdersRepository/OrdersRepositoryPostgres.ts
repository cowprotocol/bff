import { Order, SupportedChainId } from '@cowprotocol/cow-sdk';
import { logger } from '@cowprotocol/shared';
import { Pool } from 'pg';
import { getOrderBookDbPool } from '../../datasources/orderBookDbPool';
import { bytesToHexString, hexStringToBytes } from '../../utils/bytesUtils';
import { OrdersRepository } from './OrdersRepository';

export class OrdersRepositoryPostgres implements OrdersRepository {
  async getOrders(
    chainId: SupportedChainId,
    uids: string[]
  ): Promise<Map<string, Partial<Order>>> {
    const prodDb = getOrderBookDbPool('prod', chainId);
    const prodOrders = await this.fetchOrdersFromDb(uids, prodDb);
    const orders: Partial<Order>[] = prodOrders || [];

    logger.info(`Prod orders: ${JSON.stringify(prodOrders, null, 2)}`);

    if (prodOrders?.length !== uids.length) {
      const barnDb = getOrderBookDbPool('barn', chainId);
      const barnOrders = await this.fetchOrdersFromDb(uids, barnDb);

      logger.info(`Barn orders: ${JSON.stringify(barnOrders, null, 2)}`);

      if (barnOrders?.length) {
        orders.push(...barnOrders);
      }
    }

    logger.info(`Orders: ${JSON.stringify(orders, null, 2)}`);

    return orders.reduce<Map<string, Partial<Order>>>((acc, order) => {
      acc.set(order.uid!, order);
      return acc;
    }, new Map());
  }

  private async fetchOrdersFromDb(
    uids: string[],
    db: Pool
  ): Promise<Partial<Order>[] | null> {
    if (uids.length === 0) return null;

    const byteaUids = uids.map(hexStringToBytes);
    // Note: add more fields as needed
    const query = `
      SELECT uid, partially_fillable FROM orders WHERE uid = ANY($1) LIMIT 1000
    `;

    const result = await db.query(query, [byteaUids]);

    return result.rows.map((row) => {
      return {
        partiallyFillable: row.partially_fillable,
        uid: bytesToHexString(row.uid).toLowerCase(),
      };
    });
  }
}
