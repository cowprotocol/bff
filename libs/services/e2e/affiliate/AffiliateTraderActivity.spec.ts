import {
  BUGGY_TRADERS,
  getAffiliateStatsService,
  PROD_QUERY_IDS,
  PROD_TRADERS,
  STAGING_QUERY_IDS,
  STAGING_TRADERS,
} from './AffiliateTests.const'
import type { TraderActivityResult } from '../../src'

jest.setTimeout(30_000)

describe('Affiliate trader activity Dune query results', () => {
  it('snapshots prod trader activity', async () => {
    const service = getAffiliateStatsService(PROD_QUERY_IDS)
    const traderActivity: Record<string, TraderActivityResult> = {}

    for (const traderAddress of [...BUGGY_TRADERS, ...PROD_TRADERS]) {
      traderActivity[traderAddress] = await service.getTraderActivity(traderAddress)
    }

    expect(traderActivity).toMatchSnapshot('prod')
  })

  it('snapshots staging trader activity', async () => {
    const service = getAffiliateStatsService(STAGING_QUERY_IDS)
    const traderActivity: Record<string, TraderActivityResult> = {}

    for (const traderAddress of [...BUGGY_TRADERS, ...STAGING_TRADERS]) {
      traderActivity[traderAddress] = await service.getTraderActivity(traderAddress)
    }

    expect(traderActivity).toMatchSnapshot('staging')
  })
})
