import { SupportedChainId } from '@cowprotocol/cow-sdk'
import { Pool } from 'pg'
import { getOrderBookDbEnvironment, getOrderBookDbPool } from '../../datasources/orderBookDbPool'
import { bytesToHexString, hexStringToBytes } from '../../utils/bytesUtils'
import { chunkArray } from '../../utils/chunkArray'
import {
  getOrderExecutionPositionKey,
  NotificationOrder,
  OrderExecutionPosition,
  OrdersRepository,
} from './OrdersRepository'

const LIMIT = 100

export class OrdersRepositoryPostgres implements OrdersRepository {
  async getOrders(chainId: SupportedChainId, uids: string[]): Promise<Map<string, NotificationOrder>> {
    const db = getOrderBookDbPool(getOrderBookDbEnvironment(), chainId)
    return this.fetchOrdersFromDb(uids, db)
  }

  async getOrderExecutionSnapshots(
    chainId: SupportedChainId,
    positions: OrderExecutionPosition[]
  ): Promise<Map<string, NotificationOrder>> {
    const db = getOrderBookDbPool(getOrderBookDbEnvironment(), chainId)
    return this.fetchOrderExecutionSnapshotsFromDb(positions, db)
  }

  private async fetchOrdersFromDb(uids: string[], db: Pool): Promise<Map<string, NotificationOrder>> {
    if (uids.length === 0) return new Map()

    const chunks = chunkArray(uids, LIMIT)
    const orderChunks = await Promise.all(chunks.map((chunk) => this.fetchOrderChunk(chunk, db)))

    return new Map(orderChunks.flatMap((orders) => [...orders]))
  }

  private async fetchOrderExecutionSnapshotsFromDb(
    positions: OrderExecutionPosition[],
    db: Pool
  ): Promise<Map<string, NotificationOrder>> {
    if (positions.length === 0) return new Map()

    const chunks = chunkArray(positions, LIMIT)
    const snapshotChunks = await Promise.all(chunks.map((chunk) => this.fetchOrderExecutionSnapshotChunk(chunk, db)))

    return new Map(snapshotChunks.flatMap((snapshots) => [...snapshots]))
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
        o.receiver,
        COALESCE(SUM(t.sell_amount), 0) AS executed_sell_amount,
        COALESCE(SUM(t.buy_amount), 0) AS executed_buy_amount
      FROM orders o
      LEFT JOIN trades t ON t.order_uid = o.uid
      WHERE o.uid = ANY($1)
      GROUP BY o.uid, o.partially_fillable, o.kind, o.sell_amount, o.buy_amount, o.receiver
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
        receiver: row.receiver ? bytesToHexString(row.receiver) : null,
        executedSellAmount: row.executed_sell_amount,
        executedBuyAmount: row.executed_buy_amount,
      }
      orders.set(order.uid, order)
      return orders
    }, new Map())
  }

  private async fetchOrderExecutionSnapshotChunk(
    positions: OrderExecutionPosition[],
    db: Pool
  ): Promise<Map<string, NotificationOrder>> {
    const query = `
      WITH requested_positions AS (
        SELECT *
        FROM UNNEST($1::bytea[], $2::bigint[], $3::bigint[]) AS p(order_uid, block_number, log_index)
      )
      SELECT
        p.order_uid AS position_order_uid,
        p.block_number AS position_block_number,
        p.log_index AS position_log_index,
        o.uid,
        o.partially_fillable,
        o.kind,
        o.sell_amount,
        o.buy_amount,
        o.receiver,
        COALESCE(SUM(t.sell_amount), 0) AS executed_sell_amount,
        COALESCE(SUM(t.buy_amount), 0) AS executed_buy_amount
      FROM requested_positions p
      JOIN orders o ON o.uid = p.order_uid
      LEFT JOIN trades t ON t.order_uid = o.uid
        AND (
          t.block_number < p.block_number
          OR (t.block_number = p.block_number AND t.log_index <= p.log_index)
        )
      GROUP BY
        p.order_uid,
        p.block_number,
        p.log_index,
        o.uid,
        o.partially_fillable,
        o.kind,
        o.sell_amount,
        o.buy_amount,
        o.receiver
    `
    const result = await db.query(query, [
      positions.map((position) => hexStringToBytes(position.orderUid)),
      positions.map((position) => position.blockNumber.toString()),
      positions.map((position) => position.logIndex.toString()),
    ])

    return result.rows.reduce<Map<string, NotificationOrder>>((snapshots, row) => {
      const order: NotificationOrder = {
        partiallyFillable: row.partially_fillable,
        uid: bytesToHexString(row.uid).toLowerCase(),
        kind: row.kind,
        sellAmount: row.sell_amount,
        buyAmount: row.buy_amount,
        receiver: row.receiver ? bytesToHexString(row.receiver) : null,
        executedSellAmount: row.executed_sell_amount,
        executedBuyAmount: row.executed_buy_amount,
      }
      const position: OrderExecutionPosition = {
        orderUid: bytesToHexString(row.position_order_uid),
        blockNumber: BigInt(row.position_block_number),
        logIndex: Number(row.position_log_index),
      }

      snapshots.set(getOrderExecutionPositionKey(position), order)
      return snapshots
    }, new Map())
  }
}
