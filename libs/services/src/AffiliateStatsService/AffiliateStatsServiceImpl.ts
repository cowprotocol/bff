import { logger } from '@cowprotocol/shared';
import { DuneRepository } from '@cowprotocol/repositories';
import {
  AffiliateStatsResult,
  AffiliateStatsRow,
  AffiliateStatsService,
  TraderStatsResult,
  TraderStatsRow,
} from './AffiliateStatsService';
import { DUNE_MAX_ROWS, DUNE_PAGE_SIZE, DUNE_QUERY_IDS } from './AffiliateStatsService.constants';
import type { AffiliateStatsRowRaw, CacheEntry, TraderStatsRowRaw } from './AffiliateStatsService.types';
import {
  isAffiliateStatsRowRaw,
  isTraderStatsRowRaw,
  normalizeAffiliateStatsRow,
  normalizeTraderStatsRow,
} from './AffiliateStatsService.utils';

export class AffiliateStatsServiceImpl implements AffiliateStatsService {
  private readonly duneRepository: DuneRepository;
  private readonly cacheTtlMs: number;
  private readonly cache = new Map<string, CacheEntry<unknown>>();

  constructor(duneRepository: DuneRepository, cacheTtlMs: number) {
    this.duneRepository = duneRepository;
    this.cacheTtlMs = cacheTtlMs;
  }

  async getTraderStats(address: string): Promise<TraderStatsResult> {
    const normalizedAddress = address.toLowerCase();
    const { rows, lastUpdatedAt } = await this.getCachedQuery<
      TraderStatsRowRaw,
      TraderStatsRow
    >({
      cacheKey: 'affiliate-trader-stats',
      queryId: DUNE_QUERY_IDS.traderStats,
      typeAssertion: isTraderStatsRowRaw,
      mapRow: normalizeTraderStatsRow,
    });

    const filtered = rows.filter(
      (row) => row.trader_address.toLowerCase() === normalizedAddress
    );

    return { rows: filtered, lastUpdatedAt };
  }

  async getAffiliateStats(address: string): Promise<AffiliateStatsResult> {
    const normalizedAddress = address.toLowerCase();
    const { rows, lastUpdatedAt } = await this.getCachedQuery<
      AffiliateStatsRowRaw,
      AffiliateStatsRow
    >({
      cacheKey: 'affiliate-stats',
      queryId: DUNE_QUERY_IDS.affiliateStats,
      typeAssertion: isAffiliateStatsRowRaw,
      mapRow: normalizeAffiliateStatsRow,
    });

    const filtered = rows.filter(
      (row) => row.affiliate_address.toLowerCase() === normalizedAddress
    );

    return { rows: filtered, lastUpdatedAt };
  }

  private async getCachedQuery<T, U>(params: {
    cacheKey: string;
    queryId: number;
    typeAssertion: (data: unknown) => data is T;
    mapRow: (row: T) => U;
  }): Promise<{ rows: U[]; lastUpdatedAt: string }> {
    const cached = this.getCache<U>(params.cacheKey);
    if (cached) {
      return { rows: cached.rows as U[], lastUpdatedAt: cached.lastUpdatedAt };
    }

    logger.debug(`Affiliate stats cache miss for ${params.cacheKey}.`);

    try {
      const limit = DUNE_PAGE_SIZE;
      let offset = 0;
      let total: number | null = null;
      const rows: U[] = [];
      let lastUpdatedAt: string | undefined = undefined;

      let hasMore = true;
      while (hasMore) {
        const result = await this.duneRepository.getQueryResults<T>({
          queryId: params.queryId,
          typeAssertion: params.typeAssertion,
          limit,
          offset,
        });

        if (!lastUpdatedAt) {
          lastUpdatedAt =
            result.execution_started_at ||
            result.execution_ended_at ||
            result.submitted_at;
        }

        const pageRows = result.result.rows.map(params.mapRow);
        rows.push(...pageRows);

        if (total === null) {
          const metaTotal = result.result.metadata?.total_row_count;
          if (typeof metaTotal === 'number') {
            total = metaTotal;
          }
        }

        if (result.result.rows.length === 0) {
          hasMore = false;
          continue;
        }

        offset += result.result.rows.length;

        if (total !== null && offset >= total) {
          hasMore = false;
          continue;
        }

        if (result.result.rows.length < limit) {
          hasMore = false;
          continue;
        }

        if (offset >= DUNE_MAX_ROWS) {
          logger.warn(
            { cacheKey: params.cacheKey, maxRows: DUNE_MAX_ROWS },
            'Affiliate stats row limit reached. Stopping pagination.'
          );
          hasMore = false;
          continue;
        }
      }

      const resolvedLastUpdatedAt = lastUpdatedAt ?? new Date().toISOString();
      this.setCache(params.cacheKey, rows, resolvedLastUpdatedAt);
      return { rows, lastUpdatedAt: resolvedLastUpdatedAt };
    } catch (error) {
      logger.error({ error }, `Affiliate stats Dune query failed (${params.cacheKey}).`);
      throw error;
    }
  }

  private getCache<T>(key: string): CacheEntry<T> | null {
    const cached = this.cache.get(key);
    if (!cached) {
      return null;
    }

    if (Date.now() >= cached.expiresAt) {
      this.cache.delete(key);
      return null;
    }

    if (!cached.lastUpdatedAt) {
      this.cache.delete(key);
      return null;
    }

    logger.debug(`Affiliate stats cache hit for ${key}.`);
    return cached as CacheEntry<T>;
  }

  private setCache<T>(key: string, rows: T[], lastUpdatedAt: string): void {
    if (this.cacheTtlMs <= 0) {
      return;
    }

    logger.debug(`Affiliate stats cache set for ${key}.`);
    this.cache.set(key, {
      expiresAt: Date.now() + this.cacheTtlMs,
      rows,
      lastUpdatedAt,
    });
  }
}
