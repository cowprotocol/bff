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

const COW_CONTRACTS = [
  '0xba3cb449bd2b4adddbc894d8697f5170800eadec', // CoWSwapEthFlow contract on Ethereum #1.
  '0xb37add6ac288bd3825a901cba6ec65a89f31b8cc', // CoWSwapEthFlow contract on Ethereum #2.
  '0x04501b9b1d52e67f6862d157e00d13419d2d6e95', // CoWSwapEthFlow contract on Gnosis.
] as const

export const STAGING_TRADERS = [
  '0xb594b8645d43b72046d821c2404c3f63faa958db',
  '0x8b2da158bf62c024ebf2e89ee45128fcb17cc395',
  '0xbc2e953bf9a90b295918f0d6d2d2c9dcdedceed4', // Leandro #1 onchain user.
  '0xfb09f8792838b0c868deccf72d40c8235b59f6cb',
  '0x494721305c8947532e9d2860f2cf5ed79f76ab5f',
  '0x65febbc2c8beb66b0819bacb1f9fe29aaf3671e7',
  '0xc1f88cf854d66b1f5a654cbeb7e39265d062012c',
  '0x6fc1fb2e17dff120fa8f838af139af443070fd0e', // Daniel #2.
  '0x6e4bd8d3a2cd8026b33be812582eebd3cf1f737c',
  '0x9d3149a92158d6d450ab88dac3f255101c4d2e5a',
  '0x8c3d9160b69de224f25151d94cecf6558127785e',
  '0x9474b4f33b18ca96c6b843a5a8b67e4247c3b57a',
  '0xa7f90dcd9661d855f7d9fd3431efca46f3ca23d9', // Elena #1 onchain user.
  '0xbbf6b62ec48e99f545446f72d38460fb66e16feb',
  '0x9425596dc3a37af56d8d531d74c22eb675ebbd11',
  '0x56fd29500c72cc7bae2df0fb3e4ac4e150c1f8e7', // Daniel #5.
  '0x89e57bb2fd0aea41afe09c82509b3495e09cd4f1',
] as const

const RELATED_HISTORICAL_TRADERS = [
  '0xe227398f066f11e7fa49893bb97cac6caa7790f9', // Elena #2 onchain user.
] as const

export const ACTIVITY_TRADERS = [
  // cow contracts
  ...COW_CONTRACTS,

  // traders staging
  ...STAGING_TRADERS,

  // related historical traders
  ...RELATED_HISTORICAL_TRADERS,
] as const

export const STAGING_PARTNERS = [
  '0x9fa3c00a92ec5f96b1ad2527ab41b3932efeda58',
  '0xee7983b9449c74cc1eff5793dcc336275015fba0',
  '0xfb09f8792838b0c868deccf72d40c8235b59f6cb',
  '0x3de0a3f95eb59dc208fbedeaac43f5197c39709d', // Daniel #1.
  '0x5b0abe214ab7875562adee331deff0fe1912fe42',
  '0x56fd29500c72cc7bae2df0fb3e4ac4e150c1f8e7', // Daniel #5.
  '0x9425596dc3a37af56d8d531d74c22eb675ebbd11',
  '0xca011d01a4b75a36afb5e2b69e0ba8f01c6b500e',
  '0xb2f08dede8c84ee19eb90035d07391a91cf1a871',
  '0xfc1dfbc69feda4611b913d5ae7b7b48fb5909c02',
  '0x28f5e28dff9df9cbbc611dab888cbbe87bdf020d',
  '0x105eb43614808bbf301e7352aaccb4f9e2e596bb',
  '0x113692fef6415bdb421d8825913ddee50475b9c4',
  '0xfe84a86803952041ecccb584300eb66c601bfec1',
  '0xaa248d5328c7d781a96d93d7d013bcf393157bb4',
  '0xd74718dcf9d21176a7ccacb904e3236712e80383', // Daniel #3.
  '0x5345801b243ea1e53c92daca50ef498d0f197cb9', // Daniel #6.
  '0x6fc1fb2e17dff120fa8f838af139af443070fd0e', // Daniel #2.
  '0xde1e8eedd42cd284a3052d987502d0b24c633fee',
] as const

export function getAffiliateStatsService(queryIds: ReturnType<typeof getDuneQueryIds>): AffiliateStatsService {
  const getDuneQueryIdsMock = getDuneQueryIds as jest.MockedFunction<typeof getDuneQueryIds>
  getDuneQueryIdsMock.mockReturnValue(queryIds)

  return new AffiliateStatsServiceImpl(getDuneRepository(), 60_000)
}
