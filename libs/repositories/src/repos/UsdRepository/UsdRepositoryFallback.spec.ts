import { BTC_CURRENCY_ADDRESS, SupportedChainId } from '@cowprotocol/cow-sdk'
import { logger } from '@cowprotocol/shared'
import { WETH } from '../../../test/mock'
import { Erc20, Erc20Repository } from '../Erc20Repository/Erc20Repository'
import { PricePoint, UsdRepository } from './UsdRepository'
import { UsdRepositoryFallback } from './UsdRepositoryFallback'
const mockDate = new Date('2024-01-01T00:00:00Z')

const createErc20RepositoryMock = (
  erc20: Erc20 | null = { address: WETH, decimals: 18 }
): jest.Mocked<Erc20Repository> => ({
  get: jest.fn().mockResolvedValue(erc20),
})

const erc20RepositoryMock = createErc20RepositoryMock()
class UsdRepositoryMock_1_1 implements UsdRepository {
  name = 'Mock_1_1'
  async getUsdPrice() {
    return 1
  }

  async getUsdPrices(): Promise<PricePoint[] | null> {
    return [{ date: mockDate, price: 1, volume: 1 }]
  }
}

class UsdRepositoryMock_2_2 implements UsdRepository {
  name = 'Mock_2_2'
  async getUsdPrice(): Promise<number | null> {
    return 2
  }

  async getUsdPrices(): Promise<PricePoint[] | null> {
    return [{ date: mockDate, price: 2, volume: 2 }]
  }
}

class UsdRepositoryMock_null_3 implements UsdRepository {
  name = 'Mock_null_3'
  async getUsdPrice() {
    return null
  }

  async getUsdPrices(): Promise<PricePoint[] | null> {
    return [{ date: mockDate, price: 3, volume: 3 }]
  }
}

class UsdRepositoryMock_3_null implements UsdRepository {
  name = 'Mock_3_null'
  async getUsdPrice() {
    return 3
  }

  async getUsdPrices(): Promise<PricePoint[] | null> {
    return null
  }
}

class UsdRepositoryMock_null_null implements UsdRepository {
  name = 'Mock_null_null'
  async getUsdPrice() {
    return null
  }

  async getUsdPrices(): Promise<PricePoint[] | null> {
    return null
  }
}

const CHAIN_ID = SupportedChainId.MAINNET.toString()

const PARAMS_PRICE = [CHAIN_ID, WETH] as const
const PARAMS_PRICES = [CHAIN_ID, WETH, '5m'] as const
const SOLANA_USDC = 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v'

const usdRepositoryMock_1_1 = new UsdRepositoryMock_1_1()
const usdRepositoryMock_2_2 = new UsdRepositoryMock_2_2()
const usdRepositoryMock_null_3 = new UsdRepositoryMock_null_3()
const usdRepositoryMock_3_null = new UsdRepositoryMock_3_null()
const usdRepositoryMock_null_null = new UsdRepositoryMock_null_null()

describe('UsdRepositoryCoingecko', () => {
  describe('getUsdPrice', () => {
    it('Returns first repo price when is not null', async () => {
      let usdRepositoryFallback = new UsdRepositoryFallback(
        [usdRepositoryMock_1_1, usdRepositoryMock_2_2],
        erc20RepositoryMock
      )

      let price = await usdRepositoryFallback.getUsdPrice(...PARAMS_PRICE)

      expect(price).toEqual(1)

      usdRepositoryFallback = new UsdRepositoryFallback(
        [usdRepositoryMock_2_2, usdRepositoryMock_1_1],
        erc20RepositoryMock
      )

      price = await usdRepositoryFallback.getUsdPrice(...PARAMS_PRICE)

      expect(price).toEqual(2)

      usdRepositoryFallback = new UsdRepositoryFallback(
        [usdRepositoryMock_1_1, usdRepositoryMock_null_3],
        erc20RepositoryMock
      )

      price = await usdRepositoryFallback.getUsdPrice(...PARAMS_PRICE)
      expect(price).toEqual(1)
    })

    it('Returns second repo price when null, and logs the name', async () => {
      const loggerSpy = jest.spyOn(logger, 'info')
      const usdRepositoryFallback = new UsdRepositoryFallback(
        [usdRepositoryMock_null_3, usdRepositoryMock_1_1],
        erc20RepositoryMock
      )

      const price = await usdRepositoryFallback.getUsdPrice(...PARAMS_PRICE)
      expect(price).toEqual(1)
      expect(loggerSpy).toHaveBeenCalledWith(
        `UsdRepositoryFallback: ${usdRepositoryMock_null_3.name} returned null for ${PARAMS_PRICE[0]}/${PARAMS_PRICE[1]}, falling back to ${usdRepositoryMock_1_1.name}`
      )
    })

    it('Returns null when configured with no repositories', async () => {
      const usdRepositoryFallback = new UsdRepositoryFallback([], erc20RepositoryMock)
      const price = await usdRepositoryFallback.getUsdPrice(...PARAMS_PRICE)
      expect(price).toEqual(null)
    })

    it('Returns null when no repo return a price', async () => {
      const usdRepositoryFallback = new UsdRepositoryFallback(
        [usdRepositoryMock_null_3, usdRepositoryMock_null_null],
        erc20RepositoryMock
      )
      const price = await usdRepositoryFallback.getUsdPrice(...PARAMS_PRICE)
      expect(price).toEqual(null)
    })
  })

  describe('getUsdPrices', () => {
    it('Returns first repo prices when is not null', async () => {
      let usdRepositoryFallback = new UsdRepositoryFallback(
        [usdRepositoryMock_1_1, usdRepositoryMock_2_2],
        erc20RepositoryMock
      )

      let price = await usdRepositoryFallback.getUsdPrices(...PARAMS_PRICES)
      expect(price).toEqual([{ date: mockDate, price: 1, volume: 1 }])

      usdRepositoryFallback = new UsdRepositoryFallback(
        [usdRepositoryMock_2_2, usdRepositoryMock_1_1],
        erc20RepositoryMock
      )

      price = await usdRepositoryFallback.getUsdPrices(...PARAMS_PRICES)

      expect(price).toEqual([{ date: mockDate, price: 2, volume: 2 }])

      usdRepositoryFallback = new UsdRepositoryFallback(
        [usdRepositoryMock_1_1, usdRepositoryMock_null_3],
        erc20RepositoryMock
      )

      price = await usdRepositoryFallback.getUsdPrices(...PARAMS_PRICES)
      expect(price).toEqual([{ date: mockDate, price: 1, volume: 1 }])
    })

    it('Returns second repo prices when null', async () => {
      const usdRepositoryFallback = new UsdRepositoryFallback(
        [usdRepositoryMock_null_null, usdRepositoryMock_1_1],
        erc20RepositoryMock
      )

      const price = await usdRepositoryFallback.getUsdPrices(...PARAMS_PRICES)
      expect(price).toEqual([{ date: mockDate, price: 1, volume: 1 }])
    })

    it('Returns null when configured with no repositories', async () => {
      // When no repo is provided, it returns null
      const usdRepositoryFallback = new UsdRepositoryFallback([], erc20RepositoryMock)
      const price = await usdRepositoryFallback.getUsdPrices(...PARAMS_PRICES)
      expect(price).toEqual(null)
    })

    it('Returns null when no repo return prices', async () => {
      const usdRepositoryFallback = new UsdRepositoryFallback(
        [usdRepositoryMock_3_null, usdRepositoryMock_null_null],
        erc20RepositoryMock
      )
      const price = await usdRepositoryFallback.getUsdPrices(...PARAMS_PRICES)
      expect(price).toEqual(null)
    })
  })

  describe('token address filtering', () => {
    const createRepositoryMock = (name: string): jest.Mocked<UsdRepository> => ({
      name,
      getUsdPrice: jest.fn().mockResolvedValue(1),
      getUsdPrices: jest.fn().mockResolvedValue([{ date: mockDate, price: 1, volume: 1 }]),
    })

    it.each(['', '0xConToken', 'redirtest.acx', 'test'])(
      'does not query repositories for malformed token address %s',
      async (tokenAddress) => {
        const firstRepository = createRepositoryMock('First')
        const secondRepository = createRepositoryMock('Second')
        const usdRepositoryFallback = new UsdRepositoryFallback(
          [firstRepository, secondRepository],
          erc20RepositoryMock
        )

        await expect(usdRepositoryFallback.getUsdPrice(CHAIN_ID, tokenAddress)).resolves.toBeNull()
        await expect(usdRepositoryFallback.getUsdPrices(CHAIN_ID, tokenAddress, '5m')).resolves.toBeNull()

        expect(firstRepository.getUsdPrice).not.toHaveBeenCalled()
        expect(firstRepository.getUsdPrices).not.toHaveBeenCalled()
        expect(secondRepository.getUsdPrice).not.toHaveBeenCalled()
        expect(secondRepository.getUsdPrices).not.toHaveBeenCalled()
      }
    )

    it.each([
      [WETH, CHAIN_ID],
      [SOLANA_USDC, SupportedChainId.SOLANA.toString()],
      [BTC_CURRENCY_ADDRESS, 'bitcoin'],
    ])('queries repositories for valid token address %s on chain %s', async (tokenAddress, chainIdOrSlug) => {
      const firstRepository = createRepositoryMock('First')
      const usdRepositoryFallback = new UsdRepositoryFallback([firstRepository], erc20RepositoryMock)

      await expect(usdRepositoryFallback.getUsdPrice(chainIdOrSlug, tokenAddress)).resolves.toBe(1)

      expect(firstRepository.getUsdPrice).toHaveBeenCalledWith(chainIdOrSlug, tokenAddress)
    })

    it('queries repositories when the token address is omitted', async () => {
      const firstRepository = createRepositoryMock('First')
      const usdRepositoryFallback: UsdRepository = new UsdRepositoryFallback([firstRepository], erc20RepositoryMock)

      await expect(usdRepositoryFallback.getUsdPrice(CHAIN_ID)).resolves.toBe(1)

      expect(firstRepository.getUsdPrice).toHaveBeenCalledWith(CHAIN_ID, undefined)
    })
  })

  describe('token existence check', () => {
    const createRepositoryMock = (name: string): jest.Mocked<UsdRepository> => ({
      name,
      getUsdPrice: jest.fn().mockResolvedValue(1),
      getUsdPrices: jest.fn().mockResolvedValue([{ date: mockDate, price: 1, volume: 1 }]),
    })

    it('does not query repositories when the address is not an ERC20 on the requested chain', async () => {
      const firstRepository = createRepositoryMock('First')
      const erc20Repository = createErc20RepositoryMock(null)
      const usdRepositoryFallback = new UsdRepositoryFallback([firstRepository], erc20Repository)

      await expect(usdRepositoryFallback.getUsdPrice(CHAIN_ID, WETH)).resolves.toBeNull()
      await expect(usdRepositoryFallback.getUsdPrices(CHAIN_ID, WETH, '5m')).resolves.toBeNull()

      expect(erc20Repository.get).toHaveBeenCalledWith(SupportedChainId.MAINNET, WETH)
      expect(firstRepository.getUsdPrice).not.toHaveBeenCalled()
      expect(firstRepository.getUsdPrices).not.toHaveBeenCalled()
    })

    it('queries repositories when the address is an ERC20 on the requested chain', async () => {
      const firstRepository = createRepositoryMock('First')
      const erc20Repository = createErc20RepositoryMock()
      const usdRepositoryFallback = new UsdRepositoryFallback([firstRepository], erc20Repository)

      await expect(usdRepositoryFallback.getUsdPrice(CHAIN_ID, WETH)).resolves.toBe(1)

      expect(firstRepository.getUsdPrice).toHaveBeenCalledWith(CHAIN_ID, WETH)
    })

    it('does not query repositories for non-EVM addresses on EVM chains', async () => {
      const firstRepository = createRepositoryMock('First')
      const erc20Repository = createErc20RepositoryMock()
      const usdRepositoryFallback = new UsdRepositoryFallback([firstRepository], erc20Repository)

      await expect(usdRepositoryFallback.getUsdPrice(CHAIN_ID, SOLANA_USDC)).resolves.toBeNull()

      expect(erc20Repository.get).not.toHaveBeenCalled()
      expect(firstRepository.getUsdPrice).not.toHaveBeenCalled()
    })

    it('fails open and queries repositories when the existence check throws', async () => {
      const firstRepository = createRepositoryMock('First')
      const erc20Repository: jest.Mocked<Erc20Repository> = {
        get: jest.fn().mockRejectedValue(new Error('RPC is down')),
      }
      const usdRepositoryFallback = new UsdRepositoryFallback([firstRepository], erc20Repository)

      await expect(usdRepositoryFallback.getUsdPrice(CHAIN_ID, WETH)).resolves.toBe(1)

      expect(firstRepository.getUsdPrice).toHaveBeenCalledWith(CHAIN_ID, WETH)
    })

    it.each([SupportedChainId.SOLANA.toString(), '10', 'bitcoin'])(
      'skips the existence check on chains without an RPC client (%s)',
      async (chainIdOrSlug) => {
        const firstRepository = createRepositoryMock('First')
        const erc20Repository = createErc20RepositoryMock(null)
        const usdRepositoryFallback = new UsdRepositoryFallback([firstRepository], erc20Repository)

        await expect(usdRepositoryFallback.getUsdPrice(chainIdOrSlug, WETH)).resolves.toBe(1)

        expect(erc20Repository.get).not.toHaveBeenCalled()
        expect(firstRepository.getUsdPrice).toHaveBeenCalledWith(chainIdOrSlug, WETH)
      }
    )

    it('skips the existence check when the token address is omitted', async () => {
      const firstRepository = createRepositoryMock('First')
      const erc20Repository = createErc20RepositoryMock(null)
      const usdRepositoryFallback = new UsdRepositoryFallback([firstRepository], erc20Repository)

      await expect(usdRepositoryFallback.getUsdPrice(CHAIN_ID)).resolves.toBe(1)

      expect(erc20Repository.get).not.toHaveBeenCalled()
    })
  })

  describe('upstream failures', () => {
    const createRepositoryMock = (name: string): jest.Mocked<UsdRepository> => ({
      name,
      getUsdPrice: jest.fn().mockResolvedValue(1),
      getUsdPrices: jest.fn().mockResolvedValue([{ date: mockDate, price: 1, volume: 1 }]),
    })

    const createThrowingMock = (name: string, error = new Error(`${name} is down`)): jest.Mocked<UsdRepository> => ({
      name,
      getUsdPrice: jest.fn().mockRejectedValue(error),
      getUsdPrices: jest.fn().mockRejectedValue(error),
    })

    it('falls back to the next repository when one throws', async () => {
      const failing = createThrowingMock('Failing')
      const working = createRepositoryMock('Working')
      const usdRepositoryFallback = new UsdRepositoryFallback([failing, working], erc20RepositoryMock)

      await expect(usdRepositoryFallback.getUsdPrice(...PARAMS_PRICE)).resolves.toBe(1)
      await expect(usdRepositoryFallback.getUsdPrices(...PARAMS_PRICES)).resolves.toEqual([
        { date: mockDate, price: 1, volume: 1 },
      ])

      expect(working.getUsdPrice).toHaveBeenCalled()
      expect(working.getUsdPrices).toHaveBeenCalled()
    })

    it('logs the failure and the repository it falls back to', async () => {
      const loggerSpy = jest.spyOn(logger, 'warn')
      const failing = createThrowingMock('Failing')
      const usdRepositoryFallback = new UsdRepositoryFallback(
        [failing, createRepositoryMock('Working')],
        erc20RepositoryMock
      )

      await usdRepositoryFallback.getUsdPrice(...PARAMS_PRICE)

      expect(loggerSpy).toHaveBeenCalledWith(
        `UsdRepositoryFallback: Failing failed for ${PARAMS_PRICE[0]}/${PARAMS_PRICE[1]}, falling back to Working: Failing is down`
      )
    })

    /**
     * A null becomes a 404, and the frontend treats a 404 as proof the token has no price and stops
     * querying us for it for the rest of the session. An outage must never look like one.
     */
    it('rethrows when every repository throws', async () => {
      const error = new Error('Everything is down')
      const usdRepositoryFallback = new UsdRepositoryFallback(
        [createThrowingMock('First', error), createThrowingMock('Second', error)],
        erc20RepositoryMock
      )

      await expect(usdRepositoryFallback.getUsdPrice(...PARAMS_PRICE)).rejects.toThrow('Everything is down')
      await expect(usdRepositoryFallback.getUsdPrices(...PARAMS_PRICES)).rejects.toThrow('Everything is down')
    })

    it('rethrows when one repository throws and the rest find no price', async () => {
      const usdRepositoryFallback = new UsdRepositoryFallback(
        [usdRepositoryMock_null_null, createThrowingMock('Failing')],
        erc20RepositoryMock
      )

      await expect(usdRepositoryFallback.getUsdPrice(...PARAMS_PRICE)).rejects.toThrow('Failing is down')
      await expect(usdRepositoryFallback.getUsdPrices(...PARAMS_PRICES)).rejects.toThrow('Failing is down')
    })

    it('returns null without throwing when every repository cleanly reports no price', async () => {
      const usdRepositoryFallback = new UsdRepositoryFallback(
        [usdRepositoryMock_null_null, usdRepositoryMock_null_null],
        erc20RepositoryMock
      )

      await expect(usdRepositoryFallback.getUsdPrice(...PARAMS_PRICE)).resolves.toBeNull()
      await expect(usdRepositoryFallback.getUsdPrices(...PARAMS_PRICES)).resolves.toBeNull()
    })
  })
})
