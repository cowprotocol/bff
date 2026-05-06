import { SupportedChainId } from '@cowprotocol/cow-sdk'
import { BigNumber } from 'bignumber.js'
import type { AffiliateStatsRow, TraderActivityRow, TraderStatsRow } from './AffiliateStatsService'
import type { AffiliateStatsRowRaw, TraderActivityRowRaw, TraderStatsRowRaw } from './AffiliateStatsService.types'
import { isNumeric, isRecord, isString, toNumber } from '../utils/type-checking-utils'

const BLOCKCHAIN_TO_CHAIN_ID: Record<string, SupportedChainId> = {
  arbitrum: SupportedChainId.ARBITRUM_ONE,
  arbitrum_one: SupportedChainId.ARBITRUM_ONE,
  avalanche: SupportedChainId.AVALANCHE,
  avalanche_c: SupportedChainId.AVALANCHE,
  base: SupportedChainId.BASE,
  bnb: SupportedChainId.BNB,
  ethereum: SupportedChainId.MAINNET,
  ink: SupportedChainId.INK,
  gnosis: SupportedChainId.GNOSIS_CHAIN,
  linea: SupportedChainId.LINEA,
  mainnet: SupportedChainId.MAINNET,
  plasma: SupportedChainId.PLASMA,
  polygon: SupportedChainId.POLYGON,
}

export function isTraderStatsRowRaw(data: unknown): data is TraderStatsRowRaw {
  if (!isRecord(data)) {
    return false
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
  )
}

export function isTraderActivityRowRaw(data: unknown): data is TraderActivityRowRaw {
  if (!isRecord(data)) {
    return false
  }

  return (
    isString(data.blockchain) &&
    isString(data.creation_date) &&
    isString(data.tx_hash) &&
    isString(data.order_uid) &&
    isString(data.trader_address) &&
    isString(data.sell_token) &&
    isString(data.buy_token) &&
    (data.sell_token_symbol == null || isString(data.sell_token_symbol)) &&
    (data.buy_token_symbol == null || isString(data.buy_token_symbol)) &&
    isNumeric(data.executed_sell_amount) &&
    isNumeric(data.executed_buy_amount) &&
    isNumeric(data.usd_value) &&
    isNumeric(data.eligible_volume_usd) &&
    isString(data.referrer_code) &&
    isString(data.bound_referrer_code) &&
    isString(data.eligibility_reason) &&
    typeof data.is_bound_to_code === 'boolean' &&
    typeof data.is_eligible === 'boolean'
  )
}

export function isAffiliateStatsRowRaw(data: unknown): data is AffiliateStatsRowRaw {
  if (!isRecord(data)) {
    return false
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
  )
}

export function normalizeTraderStatsRow(row: TraderStatsRowRaw): TraderStatsRow {
  return {
    trader_address: row.trader_address,
    bound_referrer_code: row.bound_referrer_code,
    linked_since: row.linked_since,
    rewards_end: row.rewards_end,
    eligible_volume: toNumber(row.eligible_volume, 'eligible_volume'),
    left_to_next_rewards: toNumber(row.left_to_next_rewards, 'left_to_next_rewards'),
    trigger_volume: toNumber(row.trigger_volume, 'trigger_volume'),
    total_earned: toNumber(row.total_earned, 'total_earned'),
    paid_out: toNumber(row.paid_out, 'paid_out'),
    next_payout: toNumber(row.next_payout, 'next_payout'),
  }
}

export function normalizeTraderActivityRow(row: TraderActivityRowRaw): TraderActivityRow {
  return {
    chain_id: getChainId(row.blockchain),
    creation_date: row.creation_date,
    tx_hash: row.tx_hash,
    order_uid: row.order_uid,
    trader_address: row.trader_address,
    sell_token: row.sell_token,
    buy_token: row.buy_token,
    sell_token_symbol: row.sell_token_symbol || undefined,
    buy_token_symbol: row.buy_token_symbol || undefined,
    executed_sell_amount: toDecimalString(row.executed_sell_amount, 'executed_sell_amount'),
    executed_buy_amount: toDecimalString(row.executed_buy_amount, 'executed_buy_amount'),
    usd_value: toNumber(row.usd_value, 'usd_value'),
    eligible_volume_usd: toNumber(row.eligible_volume_usd, 'eligible_volume_usd'),
    referrer_code: row.referrer_code,
    bound_referrer_code: row.bound_referrer_code,
    eligibility_reason: row.eligibility_reason,
    is_bound_to_code: row.is_bound_to_code,
    is_eligible: row.is_eligible,
  }
}

export function normalizeAffiliateStatsRow(row: AffiliateStatsRowRaw): AffiliateStatsRow {
  return {
    affiliate_address: row.affiliate_address,
    referrer_code: row.referrer_code,
    total_volume: toNumber(row.total_volume, 'total_volume'),
    trigger_volume: toNumber(row.trigger_volume, 'trigger_volume'),
    total_earned: toNumber(row.total_earned, 'total_earned'),
    paid_out: toNumber(row.paid_out, 'paid_out'),
    next_payout: toNumber(row.next_payout, 'next_payout'),
    left_to_next_reward: toNumber(row.left_to_next_reward, 'left_to_next_reward'),
    active_traders: toNumber(row.active_traders, 'active_traders'),
    total_traders: toNumber(row.total_traders, 'total_traders'),
  }
}

function getChainId(blockchain: string): SupportedChainId {
  const normalizedBlockchain = blockchain.trim().toLowerCase()
  const chainId = BLOCKCHAIN_TO_CHAIN_ID[normalizedBlockchain]

  if (!chainId) {
    throw new Error(`Unsupported affiliate trader activity blockchain: ${blockchain}`)
  }

  return chainId
}

function toDecimalString(value: number | string, fieldName: string): string {
  const result = new BigNumber(value)

  if (!result.isFinite()) {
    throw new Error(`Invalid ${fieldName}: ${value}`)
  }

  return result.toFixed()
}
