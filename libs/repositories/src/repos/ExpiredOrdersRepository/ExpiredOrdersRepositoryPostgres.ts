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

const LIMIT = 1000;
const ORDER_EXPIRATION_THRESHOLD = 60; // 1 minute

export class ExpiredOrdersRepositoryPostgres implements ExpiredOrdersRepository {
  async fetchExpiredOrdersForAccounts(context: ExpiredOrdersContext): Promise<ParsedExpiredOrder[]> {
    const { chainId, accounts } = context;

    const prodDb = getOrderBookDbPool('prod', chainId);
    const barnDb = getOrderBookDbPool('barn', chainId);

    const prodExpiredOrdersResult = await this.fetchExpiredOrdersFromDb(context, prodDb);
    const barnExpiredOrdersResult = await this.fetchExpiredOrdersFromDb(context, barnDb);

    const allExpiredOrders = [...(prodExpiredOrdersResult?.rows || []), ...(barnExpiredOrdersResult?.rows || [])];

    const accountsMap = accounts.reduce<Set<string>>((acc, account) => {
      acc.add(account.toLowerCase());
      return acc
    }, new Set())

    return allExpiredOrders.reduce<ParsedExpiredOrder[]>((acc, order) => {
      if (accountsMap.has(bytesToHexString(order.owner).toLowerCase())) {
        acc.push(parseExpiredOrder(order))
      }

      return acc
    }, [])
  }

  private async fetchExpiredOrdersFromDb(context: ExpiredOrdersContext, db: Pool): Promise<QueryResult<ExpiredOrder> | null> {
    const { accounts, lastCheckTimestamp, nowTimestamp } = context;

    if (accounts.length === 0) return null;

    const query = `
        WITH filtered_orders AS (
            SELECT *
            FROM orders o
            WHERE o.valid_to > $1
              AND o.valid_to <= $2
        )
        SELECT
            o.uid, o.kind, o.owner, o.valid_to, o.sell_token, o.buy_token, o.sell_amount, o.buy_amount
        FROM filtered_orders o
            LEFT JOIN trades t ON t.order_uid = o.uid
            WHERE NOT EXISTS (
                SELECT 1
                FROM invalidations i
                WHERE i.order_uid = o.uid
            )
            AND NOT EXISTS (
                SELECT 1
                FROM onchain_order_invalidations oi
                WHERE oi.uid = o.uid
            )
            AND NOT EXISTS (
                SELECT 1
                FROM presignature_events pe
                WHERE pe.order_uid = o.uid
                  AND o.signing_scheme = 'presign'
                  AND pe.signed = false
            )
        GROUP BY o.uid, o.kind, o.owner, o.valid_to, o.sell_token, o.buy_token, o.sell_amount, o.buy_amount
        HAVING (
                   (o.kind = 'sell' AND COALESCE(SUM(t.sell_amount), 0) < o.sell_amount * 0.999)
                   OR (o.kind = 'buy' AND COALESCE(SUM(t.buy_amount), 0)  < o.buy_amount * 0.999)
               )
        LIMIT $3;
    `

    return db.query(query, [
      lastCheckTimestamp,
      nowTimestamp - ORDER_EXPIRATION_THRESHOLD,
      LIMIT
    ]);
  }
}
