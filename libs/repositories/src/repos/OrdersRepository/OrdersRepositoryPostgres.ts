import { SupportedChainId } from '@cowprotocol/cow-sdk'
import { Pool } from 'pg'
import { getOrderBookDbPool } from '../../datasources/orderBookDbPool'
import { bytesToHexString, hexStringToBytes } from '../../utils/bytesUtils'
import { chunkArray } from '../../utils/chunkArray'
import { NotificationOrder, OrdersRepository } from './OrdersRepository'

const LIMIT = 100

export class OrdersRepositoryPostgres implements OrdersRepository {
  async getOrders(chainId: SupportedChainId, uids: string[]): Promise<Map<string, NotificationOrder>> {
    const prodDb = getOrderBookDbPool('prod', chainId)
    const prodOrders = await this.fetchOrdersFromDb(uids, prodDb)
    const missingUids = uids.filter((uid) => !prodOrders.has(uid.toLowerCase()))

    if (missingUids.length === 0) {
      return prodOrders
    }

    const barnDb = getOrderBookDbPool('barn', chainId)
    const barnOrders = await this.fetchOrdersFromDb(missingUids, barnDb)

    return new Map([...prodOrders, ...barnOrders])
  }

  private async fetchOrdersFromDb(uids: string[], db: Pool): Promise<Map<string, NotificationOrder>> {
    if (uids.length === 0) return new Map()

    const chunks = chunkArray(uids, LIMIT)
    const orderChunks = await Promise.all(chunks.map((chunk) => this.fetchOrderChunk(chunk, db)))

    return new Map(orderChunks.flatMap((orders) => [...orders]))
  }

  private async fetchOrderChunk(uids: string[], db: Pool): Promise<Map<string, NotificationOrder>> {
    const byteaUids = uids.map(hexStringToBytes)
    const query = `
      SELECT
        o.uid,
        o.partially_fillable,
        o.kind,
        o.sell_amount,
        o.buy_amount,
        COALESCE(SUM(t.sell_amount), 0) AS executed_sell_amount,
        COALESCE(SUM(t.buy_amount), 0) AS executed_buy_amount
      FROM orders o
      LEFT JOIN trades t ON t.order_uid = o.uid
      WHERE o.uid = ANY($1)
      GROUP BY o.uid, o.partially_fillable, o.kind, o.sell_amount, o.buy_amount
      LIMIT ${LIMIT}
    `

    const result = await db.query(query, [byteaUids])

    return result.rows.reduce<Map<string, NotificationOrder>>((orders, row) => {
      const order: NotificationOrder = {
        partiallyFillable: row.partially_fillable,
        uid: bytesToHexString(row.uid).toLowerCase(),
        kind: row.kind,
        sellAmount: row.sell_amount,
        buyAmount: row.buy_amount,
        executedSellAmount: row.executed_sell_amount,
        executedBuyAmount: row.executed_buy_amount,
      }
      orders.set(order.uid, order)
      return orders
    }, new Map())
  }
}
