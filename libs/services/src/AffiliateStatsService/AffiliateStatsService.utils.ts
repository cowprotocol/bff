import type {
  AffiliateStatsRow,
  TraderStatsRow,
} from './AffiliateStatsService';
import type {
  AffiliateStatsRowRaw,
  TraderStatsRowRaw,
} from './AffiliateStatsService.types';
import { isNumeric, isRecord, isString, toNumber } from '../utils/type-checking-utils';

export function isTraderStatsRowRaw(
  data: unknown
): data is TraderStatsRowRaw {
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

export function isAffiliateStatsRowRaw(
  data: unknown
): data is AffiliateStatsRowRaw {
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

export function normalizeTraderStatsRow(
  row: TraderStatsRowRaw
): TraderStatsRow {
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

export function normalizeAffiliateStatsRow(
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
