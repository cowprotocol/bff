import { Pool, QueryResult } from 'pg';
import {
  ExpiredOrder,
  ExpiredOrdersContext,
  ExpiredOrdersRepository,
  ParsedExpiredOrder
} from './ExpiredOrdersRepository';
import { getOrderBookDbPool } from '../../datasources/orderBookDbPool';
import { bytesToHexString } from '../../utils/bytesUtils';
import { parseExpiredOrder } from './expiredOrdersUtils';

export class ExpiredOrdersRepositoryPostgres implements ExpiredOrdersRepository {
  async fetchExpiredOrdersForAccounts(context: ExpiredOrdersContext): Promise<ParsedExpiredOrder[]> {
    const { chainId, accounts } = context;

    const prodDb = getOrderBookDbPool('prod', chainId);
    const barnDb = getOrderBookDbPool('barn', chainId);

    const prodExpiredOrdersResult = await this.fetchExpiredOrdersFromDb(context, prodDb);
    const barnExpiredOrdersResult = await this.fetchExpiredOrdersFromDb(context, barnDb);

    const allExpiredOrders = [...(prodExpiredOrdersResult?.rows || []), ...(barnExpiredOrdersResult?.rows || [])];

    const accountsMap = accounts.reduce<Record<string, 1 | undefined>>((acc, account) => {
      acc[account.toLowerCase()] = 1;
      return acc
    }, {})

    return allExpiredOrders.reduce<ParsedExpiredOrder[]>((acc, order) => {
      if (accountsMap[bytesToHexString(order.owner).toLowerCase()]) {
        acc.push(parseExpiredOrder(order))
      }

      return acc
    }, [])
  }

  private async fetchExpiredOrdersFromDb(context: ExpiredOrdersContext, db: Pool): Promise<QueryResult<ExpiredOrder> | null> {
    const { accounts, lastCheckTimestamp, nowTimestamp } = context;

    if (accounts.length === 0) return null;

    const query = `
        SELECT uid, owner, valid_to, sell_token, buy_token, sell_amount, buy_amount
        FROM orders
        WHERE valid_to > ${lastCheckTimestamp}
          AND valid_to <= ${nowTimestamp}
        ORDER BY valid_to ASC
        LIMIT 1000
    `;

    return db.query(query);
  }
}
