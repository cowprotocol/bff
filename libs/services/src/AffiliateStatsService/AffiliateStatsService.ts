export const affiliateStatsServiceSymbol = Symbol.for('AffiliateStatsService');

export interface TraderStatsRow<T = number> {
  trader_address: string;
  bound_referrer_code: string;
  linked_since: string;
  rewards_end: string;
  eligible_volume: T;
  left_to_next_rewards: T;
  trigger_volume: T;
  total_earned: T;
  paid_out: T;
  next_payout: T;
}

export interface AffiliateStatsRow<T = number> {
  affiliate_address: string;
  referrer_code: string;
  total_volume: T;
  trigger_volume: T;
  total_earned: T;
  paid_out: T;
  next_payout: T;
  left_to_next_reward: T;
  active_traders: T;
  total_traders: T;
}

export interface AffiliateStatsResult {
  rows: AffiliateStatsRow[];
  lastUpdatedAt: string;
}

export interface TraderStatsResult {
  rows: TraderStatsRow[];
  lastUpdatedAt: string;
}

export interface AffiliateStatsService {
  getTraderStats(address: string): Promise<TraderStatsResult>;
  getAffiliateStats(address: string): Promise<AffiliateStatsResult>;
}
