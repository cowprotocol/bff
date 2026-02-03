import type {
  AffiliateStatsRow,
  TraderStatsRow,
} from './AffiliateStatsService';

export interface CacheEntry<T> {
  expiresAt: number;
  rows: T[];
  lastUpdatedAt: string;
}

export type NumericValue = number | string;

export type TraderStatsRowRaw = TraderStatsRow<NumericValue>;

export type AffiliateStatsRowRaw = AffiliateStatsRow<NumericValue>;
