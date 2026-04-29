export const affiliateStatsServiceSymbol = Symbol.for('AffiliateStatsService')

export interface TraderStatsRow<T = number> {
  trader_address: string
  bound_referrer_code: string
  linked_since: string
  rewards_end: string
  eligible_volume: T
  left_to_next_rewards: T
  trigger_volume: T
  total_earned: T
  paid_out: T
  next_payout: T
}

export interface TraderActivityDuneRow<T = number> {
  chain_id: number
  creation_date: string
  tx_hash: string
  order_uid: string
  trader_address: string
  sell_token: string
  buy_token: string
  executed_sell_amount: string
  executed_buy_amount: string
  usd_value: T
  eligible_volume_usd: T
  referrer_code: string
  bound_referrer_code: string
  eligibility_reason: string
  is_bound_to_code: boolean
  is_eligible: boolean
}

export interface TraderActivityRow<T = number> {
  chain_id: number
  creation_date: string
  tx_hash: string
  order_uid: string
  trader_address: string
  sell_token: string
  buy_token: string
  executed_sell_amount: string
  executed_buy_amount: string
  usd_value: T
  eligible_volume_usd: T
  referrer_code: string
  bound_referrer_code: string
  eligibility_reason: string
  is_bound_to_code: boolean
  is_eligible: boolean
}

export interface AffiliateStatsRow<T = number> {
  affiliate_address: string
  referrer_code: string
  total_volume: T
  trigger_volume: T
  total_earned: T
  paid_out: T
  next_payout: T
  left_to_next_reward: T
  active_traders: T
  total_traders: T
}

export interface AffiliateStatsResult {
  rows: AffiliateStatsRow[]
  lastUpdatedAt: string
}

export interface TraderStatsResult {
  rows: TraderStatsRow[]
  lastUpdatedAt: string
}

export interface TraderActivityResult {
  rows: TraderActivityRow[]
  lastUpdatedAt: string
}

export interface AffiliateStatsService {
  getTraderStats(address: string): Promise<TraderStatsResult>
  getTraderActivity(address: string): Promise<TraderActivityResult>
  getAffiliateStats(address: string): Promise<AffiliateStatsResult>
}
