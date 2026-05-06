export function getDuneQueryIds(): {
  traderStats: number
  traderActivity: number
  affiliateStats: number
} {
  const traderRaw = process.env.DUNE_QUERY_ID_TRADER_STATS
  if (!traderRaw) {
    throw new Error('DUNE_QUERY_ID_TRADER_STATS is not set')
  }
  const traderStats = Number.parseInt(traderRaw, 10)
  if (Number.isNaN(traderStats)) {
    throw new Error('DUNE_QUERY_ID_TRADER_STATS must be an integer')
  }

  const traderActivityRaw = process.env.DUNE_QUERY_ID_TRADER_ACTIVITY
  if (!traderActivityRaw) {
    throw new Error('DUNE_QUERY_ID_TRADER_ACTIVITY is not set')
  }
  const traderActivity = Number.parseInt(traderActivityRaw, 10)
  if (Number.isNaN(traderActivity)) {
    throw new Error('DUNE_QUERY_ID_TRADER_ACTIVITY must be an integer')
  }

  const affiliateRaw = process.env.DUNE_QUERY_ID_AFFILIATE_STATS
  if (!affiliateRaw) {
    throw new Error('DUNE_QUERY_ID_AFFILIATE_STATS is not set')
  }
  const affiliateStats = Number.parseInt(affiliateRaw, 10)
  if (Number.isNaN(affiliateStats)) {
    throw new Error('DUNE_QUERY_ID_AFFILIATE_STATS must be an integer')
  }

  return { traderStats, traderActivity, affiliateStats }
}

export const DUNE_PAGE_SIZE = 1000 as const
export const DUNE_MAX_ROWS = 1_000_000 as const
