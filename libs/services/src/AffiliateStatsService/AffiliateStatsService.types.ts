import type { AffiliateStatsRow, TraderActivityDuneRow, TraderStatsRow } from './AffiliateStatsService'

export interface CacheEntry<T> {
  expiresAt: number
  rows: T[]
  lastUpdatedAt: string
}

export type NumericValue = number | string

export type TraderStatsRowRaw = TraderStatsRow<NumericValue>

export type TraderActivityRowRaw = Omit<TraderActivityDuneRow<NumericValue>, 'chain_id'> & {
  blockchain: string
}

export type AffiliateStatsRowRaw = AffiliateStatsRow<NumericValue>
