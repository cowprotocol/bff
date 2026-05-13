import {
  getAffiliateStatsService,
  PROD_QUERY_IDS,
  PROD_TRADERS,
  STAGING_QUERY_IDS,
  STAGING_TRADERS,
} from './AffiliateTests.const'
import { sanitize } from './snapshot.utils'
import type { TraderStatsResult } from '../../src'

jest.setTimeout(30_000)

describe('Affiliate trader overview Dune query results', () => {
  it('snapshots prod trader overview', async () => {
    const service = getAffiliateStatsService(PROD_QUERY_IDS)
    const traderOverview: Record<string, TraderStatsResult> = {}

    for (const traderAddress of PROD_TRADERS) {
      traderOverview[traderAddress] = await service.getTraderStats(traderAddress)
    }

    expect(sanitize(traderOverview)).toMatchSnapshot('prod')
  })

  it('snapshots staging trader overview', async () => {
    const service = getAffiliateStatsService(STAGING_QUERY_IDS)
    const traderOverview: Record<string, TraderStatsResult> = {}

    for (const traderAddress of STAGING_TRADERS) {
      traderOverview[traderAddress] = await service.getTraderStats(traderAddress)
    }

    expect(sanitize(traderOverview)).toMatchSnapshot('staging')
  })
})
