import { Pool } from 'pg';
import { OrdersAppDataRepository } from './OrdersAppDataRepository';
import { LatestAppDataDocVersion, SupportedChainId } from '@cowprotocol/cow-sdk';
import { getOrderBookDbPool } from '../../datasources/orderBookDbPool';
import { bytesToHexString, hexStringToBytes } from '../../utils/bytesUtils';
import { logger } from '@cowprotocol/shared';
import { chunkArray } from '../../utils/chunkArray';

const LIMIT = 100;

type UidToAppData = Map<string, LatestAppDataDocVersion>;

interface AppDataFromDbResult {
  uidToAppData: UidToAppData;
  missingAppDataUids: string[];
}

const uidToAppDataCache = new Map<string, LatestAppDataDocVersion>();

export class OrdersAppDataRepositoryPostgres implements OrdersAppDataRepository {
  async getAppDataForOrders(chainId: SupportedChainId, uids: string[]): Promise<UidToAppData> {
    const cachedResults = uids.reduce((acc: UidToAppData, _uid: string) => {
      const uid = _uid.toLowerCase();
      const cached = uidToAppDataCache.get(uid);

      if (cached) acc.set(uid, cached);

      return acc;
    }, new Map<string, LatestAppDataDocVersion>());

    if (cachedResults.size === uids.length) return cachedResults;

    const prodDb = getOrderBookDbPool('prod', chainId);

    const uidsToFetch = uids.filter(uid => !cachedResults.has(uid.toLowerCase()));
    const prodChunks = chunkArray(uidsToFetch, LIMIT);

    const prodResults = await Promise.all(prodChunks.map(chunk => {
      return this.fetchAppDataFromDb(chunk, prodDb);
    }));

    const missingAppDataUidsOnProd = prodResults.reduce<string[]>((acc, result) => {
      acc.push(...result.missingAppDataUids);

      return acc;
    }, []);

    const prodUidToAppData = prodResults.reduce<UidToAppData>((acc, result) => {
      return this.mergeUidToAppDataMaps(acc, result.uidToAppData);
    }, new Map<string, LatestAppDataDocVersion>());

    const totalUidToAppData = this.mergeUidToAppDataMaps(cachedResults, prodUidToAppData);

    if (!missingAppDataUidsOnProd.length) {
      return totalUidToAppData;
    }

    const barnDb = getOrderBookDbPool('barn', chainId);
    const barnChunks = chunkArray(missingAppDataUidsOnProd, LIMIT);

    const barnResults = await Promise.all(barnChunks.map(chunk => {
      return this.fetchAppDataFromDb(chunk, barnDb);
    }));

    const barnUidToAppData = barnResults.reduce<UidToAppData>((acc, result) => {
      return this.mergeUidToAppDataMaps(acc, result.uidToAppData);
    }, new Map<string, LatestAppDataDocVersion>());

    const results = this.mergeUidToAppDataMaps(totalUidToAppData, barnUidToAppData);

    this.mergeUidToAppDataMaps(uidToAppDataCache, results);

    return results;
  }

  private async fetchAppDataFromDb(uids: string[], db: Pool): Promise<AppDataFromDbResult> {
    if (!uids.length) return { missingAppDataUids: [], uidToAppData: new Map() };

    const byteaUids = uids.map(hexStringToBytes);

    const query = `
        SELECT o.uid, a.full_app_data
        FROM orders o
          JOIN app_data a ON o.app_data = a.contract_app_data
        WHERE o.uid = ANY($1) LIMIT ${LIMIT}
    `;

    const result = await db.query(query, [byteaUids]);

    const uidToAppData = new Map();

    for (const row of result.rows) {
      const uidHex = bytesToHexString(row.uid).toLowerCase();

      try {
        const fullAppDataHex = JSON.parse(row.full_app_data.toString());
        uidToAppData.set(uidHex, fullAppDataHex);
      } catch (error) {
        logger.error(
          error,
          `Could not parse app data from DB`
        );
      }
    }

    const missingAppDataUids = uids.filter(id => !uidToAppData.has(id.toLowerCase()));

    return { uidToAppData, missingAppDataUids };
  }

  private mergeUidToAppDataMaps(map1: UidToAppData, map2: UidToAppData): UidToAppData {
    for (const [key, value] of map2) {
      map1.set(key, value);
    }

    return map1;
  }
}
