import { Pool } from 'pg'
import { OrdersAppDataRepository } from './OrdersAppDataRepository'
import { AnyAppDataDocVersion, SupportedChainId } from '@cowprotocol/cow-sdk'
import { getOrderBookDbEnvironment, getOrderBookDbPool } from '../../datasources/orderBookDbPool'
import { bytesToHexString, hexStringToBytes } from '../../utils/bytesUtils'
import { logger } from '@cowprotocol/shared'
import { chunkArray } from '../../utils/chunkArray'

const LIMIT = 100

type UidToAppData = Map<string, AnyAppDataDocVersion>

interface AppDataFromDbResult {
  uidToAppData: UidToAppData
  missingAppDataUids: string[]
}

const uidToAppDataCache = new Map<string, AnyAppDataDocVersion>()

export class OrdersAppDataRepositoryPostgres implements OrdersAppDataRepository {
  async getAppDataForOrders(chainId: SupportedChainId, uids: string[]): Promise<UidToAppData> {
    const cachedResults = uids.reduce((acc: UidToAppData, _uid: string) => {
      const uid = _uid.toLowerCase()
      const cached = uidToAppDataCache.get(uid)

      if (cached) acc.set(uid, cached)

      return acc
    }, new Map<string, AnyAppDataDocVersion>())

    if (cachedResults.size === uids.length) return cachedResults

    const uidsToFetch = uids.filter((uid) => !cachedResults.has(uid.toLowerCase()))
    const db = getOrderBookDbPool(getOrderBookDbEnvironment(), chainId)
    const chunks = chunkArray(uidsToFetch, LIMIT)
    const results = await Promise.all(
      chunks.map((chunk) => {
        return this.fetchAppDataFromDb(chunk, db)
      })
    )

    const uidToAppData = results.reduce<UidToAppData>((acc, result) => {
      return this.mergeUidToAppDataMaps(acc, result.uidToAppData)
    }, new Map<string, AnyAppDataDocVersion>())

    const totalUidToAppData = this.mergeUidToAppDataMaps(cachedResults, uidToAppData)
    this.mergeUidToAppDataMaps(uidToAppDataCache, totalUidToAppData)

    return totalUidToAppData
  }

  private async fetchAppDataFromDb(uids: string[], db: Pool): Promise<AppDataFromDbResult> {
    if (!uids.length) return { missingAppDataUids: [], uidToAppData: new Map() }

    const byteaUids = uids.map(hexStringToBytes)

    const query = `
        SELECT o.uid, a.full_app_data
        FROM orders o
          JOIN app_data a ON o.app_data = a.contract_app_data
        WHERE o.uid = ANY($1) LIMIT $2
    `

    const result = await db.query(query, [byteaUids, LIMIT])

    const uidToAppData = new Map()

    for (const row of result.rows) {
      const uidHex = bytesToHexString(row.uid).toLowerCase()

      try {
        const fullAppDataHex = JSON.parse(row.full_app_data.toString())
        uidToAppData.set(uidHex, fullAppDataHex)
      } catch (error) {
        logger.error(error, `Could not parse app data from DB`)
      }
    }

    const missingAppDataUids = uids.filter((id) => !uidToAppData.has(id.toLowerCase()))

    return { uidToAppData, missingAppDataUids }
  }

  private mergeUidToAppDataMaps(map1: UidToAppData, map2: UidToAppData): UidToAppData {
    for (const [key, value] of map2) {
      map1.set(key, value)
    }

    return map1
  }
}
