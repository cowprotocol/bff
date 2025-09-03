import { Pool, QueryResult } from 'pg';
import { OnChainPlacedOrdersRepository } from './OnChainPlacedOrdersRepository';
import { SupportedChainId } from '@cowprotocol/cow-sdk';
import { getOrderBookDbPool } from '../../datasources/orderBookDbPool';

interface OnChainPlacedOrder {
  sender: Buffer;
  uid: Buffer;
}

type AccountsForOrders = { [account: string]: string[] }

export class OnChainPlacedOrdersRepositoryPostgres implements OnChainPlacedOrdersRepository {
  async getAccountsForOrders(chainId: SupportedChainId, uids: string[]): Promise<AccountsForOrders> {
    const orders: OnChainPlacedOrder[] = [];

    const prodDb = getOrderBookDbPool('prod', chainId);
    const prodOrders = await this.fetchOnChainPlacedOrdersFromDb(uids, prodDb);

    if (!prodOrders?.rowCount) {
      const barnDb = getOrderBookDbPool('barn', chainId);
      const barnOrders = await this.fetchOnChainPlacedOrdersFromDb(uids, barnDb);

      if (barnOrders?.rowCount) {
        orders.push(...barnOrders.rows);
      }
    } else {
      orders.push(...prodOrders.rows);
    }

    return orders.reduce<AccountsForOrders>((acc, row) => {
      const owner = '0x' + row.sender.toString('hex').toLowerCase();

      acc[owner] = acc[owner] || [];

      acc[owner].push('0x' + row.uid.toString('hex').toLowerCase());

      return acc;
    }, {});
  }

  private async fetchOnChainPlacedOrdersFromDb(uids: string[], db: Pool): Promise<QueryResult<OnChainPlacedOrder> | null> {
    if (uids.length === 0) return null

    const query = `
        SELECT sender, uid
        FROM onchain_placed_orders
        WHERE uid = ANY($1) LIMIT 1000
    `;

    const params = uids.map(hex => Buffer.from(hex.slice(2), 'hex'));

    return db.query(query, [params]);
  }
}
