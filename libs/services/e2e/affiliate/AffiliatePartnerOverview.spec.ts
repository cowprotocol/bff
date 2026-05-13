import {
  getAffiliateStatsService,
  PROD_PARTNERS,
  PROD_QUERY_IDS,
  STAGING_PARTNERS,
  STAGING_QUERY_IDS,
} from './AffiliateTests.const'
import { sanitize } from './snapshot.utils'
import type { AffiliateStatsResult } from '../../src'

jest.setTimeout(30_000)

describe('Affiliate partner overview Dune query results', () => {
  it('snapshots prod partner overview', async () => {
    const service = getAffiliateStatsService(PROD_QUERY_IDS)
    const partnerOverview: Record<string, AffiliateStatsResult> = {}

    for (const partnerAddress of PROD_PARTNERS) {
      partnerOverview[partnerAddress] = await service.getAffiliateStats(partnerAddress)
    }

    expect(sanitize(partnerOverview)).toMatchSnapshot('prod')
  })

  it('snapshots staging partner overview', async () => {
    const service = getAffiliateStatsService(STAGING_QUERY_IDS)
    const partnerOverview: Record<string, AffiliateStatsResult> = {}

    for (const partnerAddress of STAGING_PARTNERS) {
      partnerOverview[partnerAddress] = await service.getAffiliateStats(partnerAddress)
    }

    expect(sanitize(partnerOverview)).toMatchSnapshot('staging')
  })
})
