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
      WITH trade_sums AS (
        SELECT
          order_uid,
          COALESCE(SUM(sell_amount), 0) AS filled_sell,
          COALESCE(SUM(buy_amount), 0)  AS filled_buy
        FROM trades
        GROUP BY order_uid
      )
      SELECT o.uid, o.kind, o.owner, o.valid_to, o.sell_token, o.buy_token, o.sell_amount, o.buy_amount
      FROM orders o
      LEFT JOIN trade_sums t ON o.uid = t.order_uid
      WHERE
        o.valid_to > ${lastCheckTimestamp}
        AND o.valid_to <= ${nowTimestamp}
        AND (
          (o.kind = 'sell' AND (t.filled_sell < o.sell_amount OR t.filled_sell IS NULL))
              OR
          (o.kind = 'buy'  AND (t.filled_buy  < o.buy_amount  OR t.filled_buy IS NULL))
        )
      ORDER BY o.valid_to ASC
      LIMIT 1000;
    `

    return db.query(query);
  }
}
