import 'dotenv/config'
import { AffiliateStatsServiceImpl, getDuneRepository } from '../../src'
import { getDuneQueryIds } from '../../src/AffiliateStatsService/AffiliateStatsService.config'
import type { AffiliateStatsService } from '../../src'

jest.mock('../../src/AffiliateStatsService/AffiliateStatsService.config', () => {
  const actual = jest.requireActual('../../src/AffiliateStatsService/AffiliateStatsService.config')

  return {
    ...actual,
    getDuneQueryIds: jest.fn(),
  }
})

export const PROD_QUERY_IDS = {
  traderStats: 6648679,
  traderActivity: 6683651,
  affiliateStats: 6648689,
} as const

export const STAGING_QUERY_IDS = {
  traderStats: 6648679,
  traderActivity: 6561349,
  affiliateStats: 6648689,
} as const

export const STAGING_TRADERS = [
  '0xa7f90dcd9661d855f7d9fd3431efca46f3ca23d9', // Elena #1
  '0x8b2da158bf62c024ebf2e89ee45128fcb17cc395', // Elena #3
  '0xb594b8645d43b72046d821c2404c3f63faa958db', // Elena #4
  '0x9425596dc3a37af56d8d531d74c22eb675ebbd11', // Elena #5
  '0xfb09f8792838b0c868deccf72d40c8235b59f6cb', // Elena #6
  '0x494721305c8947532e9d2860f2cf5ed79f76ab5f', // Elena #7
  '0x65febbc2c8beb66b0819bacb1f9fe29aaf3671e7', // Elena #8
  '0xc1f88cf854d66b1f5a654cbeb7e39265d062012c', // Elena #9
  '0x6e4bd8d3a2cd8026b33be812582eebd3cf1f737c', // Elena #10
  '0x9d3149a92158d6d450ab88dac3f255101c4d2e5a', // Elena #11
  '0x8c3d9160b69de224f25151d94cecf6558127785e', // Elena #12
  '0x9474b4f33b18ca96c6b843a5a8b67e4247c3b57a', // Elena #13
  '0xbbf6b62ec48e99f545446f72d38460fb66e16feb', // Elena #14
  '0x89e57bb2fd0aea41afe09c82509b3495e09cd4f1', // Elena #15
  '0xbc2e953bf9a90b295918f0d6d2d2c9dcdedceed4', // Leandro #1
  '0x6fc1fb2e17dff120fa8f838af139af443070fd0e', // Daniel #2
  '0x56fd29500c72cc7bae2df0fb3e4ac4e150c1f8e7', // Daniel #5
] as const

// Prod traders overview, top 20 sorted by linked_since asc.
export const PROD_TRADERS = [
  '0x56fd29500c72cc7bae2df0fb3e4ac4e150c1f8e7', // Daniel #5
  '0x4936167dae4160e5556d9294f2c78675659a3b63',
  '0x5bb4314fc60eec585238513c64cdd44584d07f26',
  '0x6345d8cebe906c721513debcfff6de2833a87d16',
  '0x64106af7eb803962e8f4e814e3f09935b2f0548a',
  '0x789b917ec151791f673367655f25fea5d50aa071',
  '0xd3ca8d63a5659a252ff40bf8acfc9610c22ab918',
  '0x7e930856351d6119fe3b1ebc56683d8096629e1a',
  '0x48215a1381995aa7f947699194037017e5192661',
  '0x67202f3de01ad7bbe8a7e60c31662c6310209105',
  '0x00a7cbcfb2162239b5cb112c8e7ad0b799f670b2',
  '0x563a1b3c8f5012afa5470bd1459d8fe1fe825dba',
  '0x222f1e12f405fde96354c8dc14b126a847bead48',
  '0xee96d72a4451311ccd5c43a0ba6ce36f1ce63a2b',
  '0x6de7943421c3c924808b6e173b9a656b447b1d78',
  '0x3eb5988c37991e661b83106f951db33785a58912',
  '0x161394bbf9a95f33224a9e4e3561120922444359',
  '0x8176104c11772b8a4c22dd931c9176836cb812ee',
  '0x69b67903ada8a31f0e3ec5b6721d23a7e688dfbd',
  '0x8b0c2cf694447e286bc65f9d5f9b55299ebce4b6',
] as const

export const BUGGY_TRADERS = [
  // cow contracts
  '0xba3cb449bd2b4adddbc894d8697f5170800eadec', // CoWSwapEthFlow contract on Ethereum #1
  '0xb37add6ac288bd3825a901cba6ec65a89f31b8cc', // CoWSwapEthFlow contract on Ethereum #2
  '0x04501b9b1d52e67f6862d157e00d13419d2d6e95', // CoWSwapEthFlow contract on Gnosis

  '0xe227398f066f11e7fa49893bb97cac6caa7790f9', // JohnDoe
] as const

export const STAGING_PARTNERS = [
  '0x9425596dc3a37af56d8d531d74c22eb675ebbd11', // Elena #5
  '0xfb09f8792838b0c868deccf72d40c8235b59f6cb', // Elena #6
  '0x9fa3c00a92ec5f96b1ad2527ab41b3932efeda58', // Elena #16
  '0xee7983b9449c74cc1eff5793dcc336275015fba0', // Elena #17
  '0x3de0a3f95eb59dc208fbedeaac43f5197c39709d', // Daniel #1
  '0x6fc1fb2e17dff120fa8f838af139af443070fd0e', // Daniel #2
  '0xd74718dcf9d21176a7ccacb904e3236712e80383', // Daniel #3
  '0x56fd29500c72cc7bae2df0fb3e4ac4e150c1f8e7', // Daniel #5
  '0x5345801b243ea1e53c92daca50ef498d0f197cb9', // Daniel #6
  '0x5b0abe214ab7875562adee331deff0fe1912fe42',
  '0xca011d01a4b75a36afb5e2b69e0ba8f01c6b500e',
  '0xb2f08dede8c84ee19eb90035d07391a91cf1a871',
  '0xfc1dfbc69feda4611b913d5ae7b7b48fb5909c02',
  '0x28f5e28dff9df9cbbc611dab888cbbe87bdf020d',
  '0x105eb43614808bbf301e7352aaccb4f9e2e596bb',
  '0x113692fef6415bdb421d8825913ddee50475b9c4',
  '0xfe84a86803952041ecccb584300eb66c601bfec1',
  '0xaa248d5328c7d781a96d93d7d013bcf393157bb4',
  '0xde1e8eedd42cd284a3052d987502d0b24c633fee',
] as const

// Prod partner overview, sorted by left_to_next_reward asc.
export const PROD_PARTNERS = [
  '0x9fa3c00a92ec5f96b1ad2527ab41b3932efeda58', // Elena #16
  '0xd26a907dcaaa0e4393972283e662eb272a173944',
  '0x8335459a89a17ed8ed128aa98f9af86802dacf30',
  '0x798ff1e6d7afd28c333ee6ebe03125d30ec6ef10',
  '0x7babf976fbd6f420fbae9f5b3622209cfdd5a759',
  '0x48825198628fe6109603d4693cd5074c47716518',
  '0x2c6e2e2eb9153631aa098d671df870a0f9026d74',
  '0x72cc486baafb0804c1a1f4260432688c10d7ad99',
] as const

export function getAffiliateStatsService(queryIds: ReturnType<typeof getDuneQueryIds>): AffiliateStatsService {
  const getDuneQueryIdsMock = getDuneQueryIds as jest.MockedFunction<typeof getDuneQueryIds>
  getDuneQueryIdsMock.mockReturnValue(queryIds)

  return new AffiliateStatsServiceImpl(getDuneRepository(), 60_000)
}
