export const affiliateStatsServiceSymbol = Symbol.for('AffiliateStatsService');

export interface TraderStatsRow {
  trader_address: string;
  bound_referrer_code: string;
  linked_since: string;
  rewards_end: string;
  eligible_volume: number;
  left_to_next_rewards: number;
  trigger_volume: number;
  total_earned: number;
  paid_out: number;
  next_payout: number;
}

export interface AffiliateStatsRow {
  affiliate_address: string;
  referrer_code: string;
  total_volume: number;
  trigger_volume: number;
  total_earned: number;
  paid_out: number;
  next_payout: number;
  left_to_next_reward: number;
  active_traders: number;
  total_traders: number;
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
