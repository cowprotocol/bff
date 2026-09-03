import pino from 'pino'
import { PriceHistoryService } from './priceHistory.service'
import {
  PRICE_HISTORY_PROVIDER_IDS,
  PriceHistoryBar,
  PriceHistoryProvider,
  PriceHistoryRequest,
} from './priceHistory.types'

const REQUEST: PriceHistoryRequest = {
  chainId: 1,
  tokenAddress: '0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48',
  from: 1710000000,
  to: 1710007200,
  interval: '1h',
}
const BAR: PriceHistoryBar = { timestamp: 1710000000, open: 1, high: 2, low: 0.5, close: 1.5 }
const logger = pino({ enabled: false })

function provider(
  id: 1 | 2,
  fetchBars: PriceHistoryProvider['fetchBars'],
  supportsInterval: PriceHistoryProvider['supportsInterval'] = () => true
): PriceHistoryProvider {
  return { id, fetchBars, supportsInterval }
}

describe('PriceHistoryService', () => {
  it.each(['', ' ', '1,', '1,1', '1,x', '1,3'])('rejects invalid order %p', (order) => {
    expect(() => new PriceHistoryService([], order, logger)).toThrow()
  })
  it('honors provider order', async () => {
    const upstreamProvider = provider(PRICE_HISTORY_PROVIDER_IDS.UPSTREAM, jest.fn().mockResolvedValue([BAR]))
    const codex = provider(PRICE_HISTORY_PROVIDER_IDS.CODEX, jest.fn().mockResolvedValue([{ ...BAR, close: 2 }]))
    const service = new PriceHistoryService([upstreamProvider, codex], '2,1', logger)

    await expect(service.getPriceHistory(REQUEST)).resolves.toEqual({ providerId: 2, bars: [{ ...BAR, close: 2 }] })
    expect(upstreamProvider.fetchBars).not.toHaveBeenCalled()
  })

  it.each([
    ['unsupported', undefined],
    ['failure', new Error('failed')],
    ['invalid response', [{ ...BAR, high: 0.25 }]],
  ])('falls back after %s', async (_reason, firstResult) => {
    const supportsInterval = firstResult === undefined ? () => false : () => true
    const firstFetch =
      firstResult instanceof Error
        ? jest.fn().mockRejectedValue(firstResult)
        : jest.fn().mockResolvedValue(firstResult ?? [])
    const service = new PriceHistoryService(
      [provider(1, firstFetch, supportsInterval), provider(2, jest.fn().mockResolvedValue([BAR]))],
      '1,2',
      logger
    )

    await expect(service.getPriceHistory(REQUEST)).resolves.toEqual({ providerId: 2, bars: [BAR] })
  })

  it('falls back after a provider timeout', async () => {
    jest.useFakeTimers()
    const hanging = provider(
      1,
      (_request, signal) =>
        new Promise((_resolve, reject) => {
          signal.addEventListener('abort', () => reject(new Error('aborted')))
        })
    )
    const service = new PriceHistoryService([hanging, provider(2, jest.fn().mockResolvedValue([BAR]))], '1,2', logger)

    const result = service.getPriceHistory(REQUEST)
    await jest.advanceTimersByTimeAsync(10_000)
    await expect(result).resolves.toEqual({ providerId: 2, bars: [BAR] })
    jest.useRealTimers()
  })

  it('fails after all providers time out', async () => {
    jest.useFakeTimers()
    const hanging = (id: 1 | 2) =>
      provider(
        id,
        (_request, signal) =>
          new Promise((_resolve, reject) => {
            signal.addEventListener('abort', () => reject(new Error('aborted')))
          })
      )
    const service = new PriceHistoryService([hanging(1), hanging(2)], '1,2', logger)

    const result = service.getPriceHistory(REQUEST)
    await jest.advanceTimersByTimeAsync(20_000)
    await expect(result).rejects.toThrow('Price history providers failed')
    jest.useRealTimers()
  })

  it('returns an empty response without falling back', async () => {
    const codexFetch = jest.fn().mockResolvedValue([BAR])
    const service = new PriceHistoryService(
      [provider(1, jest.fn().mockResolvedValue([])), provider(2, codexFetch)],
      '1,2',
      logger
    )

    await expect(service.getPriceHistory(REQUEST)).resolves.toEqual({ providerId: 1, bars: [] })
    expect(codexFetch).not.toHaveBeenCalled()
  })

  it('returns optional volume without falling back', async () => {
    const codexFetch = jest.fn().mockResolvedValue([BAR])
    const barWithVolume = { ...BAR, volume: 123.45 }
    const service = new PriceHistoryService(
      [provider(1, jest.fn().mockResolvedValue([barWithVolume])), provider(2, codexFetch)],
      '1,2',
      logger
    )

    await expect(service.getPriceHistory(REQUEST)).resolves.toEqual({ providerId: 1, bars: [barWithVolume] })
    expect(codexFetch).not.toHaveBeenCalled()
  })
})
