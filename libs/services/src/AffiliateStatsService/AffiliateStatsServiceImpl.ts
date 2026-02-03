import { logger } from '@cowprotocol/shared';
import { DuneRepository } from '@cowprotocol/repositories';
import {
  AffiliateStatsResult,
  AffiliateStatsRow,
  AffiliateStatsService,
  TraderStatsResult,
  TraderStatsRow,
} from './AffiliateStatsService';

const TRADER_STATS_QUERY_ID = 6560853;
const AFFILIATE_STATS_QUERY_ID = 6560325;
const DUNE_PAGE_SIZE = 1000;
const DUNE_MAX_ROWS = 1_000_000;

type CacheEntry<T> = {
  expiresAt: number;
  rows: T[];
  lastUpdatedAt: string;
};

type NumericValue = number | string;

type TraderStatsRowRaw = TraderStatsRow<NumericValue>;

type AffiliateStatsRowRaw = AffiliateStatsRow<NumericValue>;

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
      queryId: TRADER_STATS_QUERY_ID,
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
      queryId: AFFILIATE_STATS_QUERY_ID,
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

function isTraderStatsRowRaw(data: unknown): data is TraderStatsRowRaw {
  if (!isRecord(data)) {
    return false;
  }

  return (
    isString(data.trader_address) &&
    isString(data.bound_referrer_code) &&
    isString(data.linked_since) &&
    isString(data.rewards_end) &&
    isNumeric(data.eligible_volume) &&
    isNumeric(data.left_to_next_rewards) &&
    isNumeric(data.trigger_volume) &&
    isNumeric(data.total_earned) &&
    isNumeric(data.paid_out) &&
    isNumeric(data.next_payout)
  );
}

function isAffiliateStatsRowRaw(data: unknown): data is AffiliateStatsRowRaw {
  if (!isRecord(data)) {
    return false;
  }

  return (
    isString(data.affiliate_address) &&
    isString(data.referrer_code) &&
    isNumeric(data.total_volume) &&
    isNumeric(data.trigger_volume) &&
    isNumeric(data.total_earned) &&
    isNumeric(data.paid_out) &&
    isNumeric(data.next_payout) &&
    isNumeric(data.left_to_next_reward) &&
    isNumeric(data.active_traders) &&
    isNumeric(data.total_traders)
  );
}

function normalizeTraderStatsRow(row: TraderStatsRowRaw): TraderStatsRow {
  return {
    trader_address: row.trader_address,
    bound_referrer_code: row.bound_referrer_code,
    linked_since: row.linked_since,
    rewards_end: row.rewards_end,
    eligible_volume: toNumber(row.eligible_volume, 'eligible_volume'),
    left_to_next_rewards: toNumber(
      row.left_to_next_rewards,
      'left_to_next_rewards'
    ),
    trigger_volume: toNumber(row.trigger_volume, 'trigger_volume'),
    total_earned: toNumber(row.total_earned, 'total_earned'),
    paid_out: toNumber(row.paid_out, 'paid_out'),
    next_payout: toNumber(row.next_payout, 'next_payout'),
  };
}

function normalizeAffiliateStatsRow(
  row: AffiliateStatsRowRaw
): AffiliateStatsRow {
  return {
    affiliate_address: row.affiliate_address,
    referrer_code: row.referrer_code,
    total_volume: toNumber(row.total_volume, 'total_volume'),
    trigger_volume: toNumber(row.trigger_volume, 'trigger_volume'),
    total_earned: toNumber(row.total_earned, 'total_earned'),
    paid_out: toNumber(row.paid_out, 'paid_out'),
    next_payout: toNumber(row.next_payout, 'next_payout'),
    left_to_next_reward: toNumber(
      row.left_to_next_reward,
      'left_to_next_reward'
    ),
    active_traders: toNumber(row.active_traders, 'active_traders'),
    total_traders: toNumber(row.total_traders, 'total_traders'),
  };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function isString(value: unknown): value is string {
  return typeof value === 'string';
}

function isNumeric(value: unknown): value is NumericValue {
  if (typeof value === 'number') {
    return !Number.isNaN(value);
  }

  if (typeof value === 'string') {
    return value.trim().length > 0 && !Number.isNaN(Number(value));
  }

  return false;
}

function toNumber(value: NumericValue, field: string): number {
  const parsed = Number(value);
  if (Number.isNaN(parsed)) {
    throw new Error(`Invalid numeric value for ${field}: ${value}`);
  }

  return parsed;
}
