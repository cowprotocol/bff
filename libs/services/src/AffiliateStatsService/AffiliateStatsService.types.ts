import type { AffiliateStatsRow, TraderActivityRow, TraderStatsRow } from './AffiliateStatsService'

export interface CacheEntry<T> {
  expiresAt: number
  rows: T[]
  lastUpdatedAt: string
}

export type NumericValue = number | string

export type TraderStatsRowRaw = TraderStatsRow<NumericValue>

export type TraderActivityRowRaw = Omit<
  TraderActivityRow<NumericValue>,
  'chain_id' | 'sell_token_symbol' | 'buy_token_symbol'
> & {
  blockchain: string
  sell_token_symbol?: string | null
  buy_token_symbol?: string | null
}

export type AffiliateStatsRowRaw = AffiliateStatsRow<NumericValue>
