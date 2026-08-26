import { EVM_NATIVE_CURRENCY_ADDRESS, SupportedChainId } from '@cowprotocol/cow-sdk'
import { WETH } from '../../../test/mock'

const get = jest.fn()

jest.mock('../../datasources/coingecko', () => ({
  ...jest.requireActual('../../datasources/coingecko'),
  getCoingeckoProClient: () => ({ GET: get }),
}))

import { UsdRepositoryCoingecko } from './UsdRepositoryCoingecko'

const okResponse = (data: unknown) => ({ data, response: { status: 200, ok: true } as Response })

describe('UsdRepositoryCoingecko', () => {
  let repository: UsdRepositoryCoingecko

  beforeEach(() => {
    get.mockReset()
    repository = new UsdRepositoryCoingecko()
  })

  describe('native currency pricing', () => {
    /**
     * Regression guard. Sending the platform id as the coin id returned the price of an unrelated
     * token that happens to own that id ("Base", "Linea", "Ink"), served as the chain's native price.
     */
    it.each([
      [SupportedChainId.BASE, 'ethereum'],
      [SupportedChainId.LINEA, 'ethereum'],
      [SupportedChainId.INK, 'ethereum'],
      [SupportedChainId.BNB, 'binancecoin'],
      [SupportedChainId.POLYGON, 'polygon-ecosystem-token'],
      [SupportedChainId.AVALANCHE, 'avalanche-2'],
    ])('looks up chain %s native price by coin id %s', async (chainId, coinId) => {
      get.mockResolvedValue(okResponse({ [coinId]: { usd: 2449 } }))

      const price = await repository.getUsdPrice(chainId.toString(), EVM_NATIVE_CURRENCY_ADDRESS)

      expect(price).toBe(2449)
      expect(get).toHaveBeenCalledWith('/simple/price', {
        params: { query: { ids: coinId, vs_currencies: 'usd' } },
      })
    })

    it('uses the coin id on the historical price path too', async () => {
      get.mockResolvedValue(okResponse({ prices: [[1, 2449]], total_volumes: [[1, 10]] }))

      await repository.getUsdPrices(SupportedChainId.BASE.toString(), EVM_NATIVE_CURRENCY_ADDRESS, '5m')

      expect(get).toHaveBeenCalledWith('/coins/{id}/market_chart', {
        params: {
          path: { id: 'ethereum' },
          query: { vs_currency: 'usd', days: '1', interval: undefined },
        },
      })
    })

    it('returns null without calling CoinGecko when the chain has no native coin id', async () => {
      const price = await repository.getUsdPrice(SupportedChainId.SEPOLIA.toString(), EVM_NATIVE_CURRENCY_ADDRESS)

      expect(price).toBeNull()
      expect(get).not.toHaveBeenCalled()
    })
  })

  describe('unmapped chains', () => {
    it.each(['123456', 'mainnet'])('returns null without calling CoinGecko for %s', async (chainIdOrSlug) => {
      await expect(repository.getUsdPrice(chainIdOrSlug, WETH)).resolves.toBeNull()
      await expect(repository.getUsdPrices(chainIdOrSlug, WETH, '5m')).resolves.toBeNull()

      expect(get).not.toHaveBeenCalled()
    })
  })

  describe('token pricing', () => {
    it('still looks tokens up by contract address on their platform', async () => {
      get.mockResolvedValue(okResponse({ [WETH.toLowerCase()]: { usd: 2449 } }))

      const price = await repository.getUsdPrice(SupportedChainId.BASE.toString(), WETH)

      expect(price).toBe(2449)
      expect(get).toHaveBeenCalledWith('/simple/token_price/{id}', {
        params: {
          path: { id: 'base' },
          query: { contract_addresses: WETH.toLowerCase(), vs_currencies: 'usd' },
        },
      })
    })
  })
})
