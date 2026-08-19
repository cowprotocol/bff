import type { Logger } from '@cowprotocol/shared'
import {
  getProviderName,
  normalizePriceHistoryBars,
  PRICE_HISTORY_PROVIDER_IDS,
  PriceHistoryProvider,
  PriceHistoryProviderId,
  PriceHistoryRequest,
  PriceHistoryResult,
} from './priceHistory.types'

const PRICE_HISTORY_PROVIDER_TIMEOUT_MS = 10_000

const KNOWN_PROVIDER_IDS = new Set<PriceHistoryProviderId>([
  PRICE_HISTORY_PROVIDER_IDS.UPSTREAM,
  PRICE_HISTORY_PROVIDER_IDS.CODEX,
])

export class PriceHistoryService {
  private readonly providers = new Map<PriceHistoryProviderId, PriceHistoryProvider>()
  private readonly providerOrder: PriceHistoryProviderId[]

  constructor(providers: PriceHistoryProvider[], providerOrder: string, private readonly logger: Logger) {
    for (const provider of providers) {
      this.providers.set(provider.id, provider)
    }

    const rawIds = providerOrder.split(',')
    if (rawIds.length === 0 || rawIds.some((id) => id.trim() === '')) {
      throw new Error('Malformed PRICE_HISTORY_PROVIDER_ORDER')
    }

    this.providerOrder = rawIds.map((rawId) => {
      const id = rawId.trim()
      if (!/^\d+$/.test(id)) {
        throw new Error('Malformed PRICE_HISTORY_PROVIDER_ORDER')
      }

      const providerId = Number(id) as PriceHistoryProviderId
      if (!KNOWN_PROVIDER_IDS.has(providerId)) {
        throw new Error(`Unknown price history provider ID: ${id}`)
      }

      return providerId
    })

    if (new Set(this.providerOrder).size !== this.providerOrder.length) {
      throw new Error('Duplicate price history provider ID')
    }
  }

  async getPriceHistory(request: PriceHistoryRequest): Promise<PriceHistoryResult> {
    for (const [index, providerId] of this.providerOrder.entries()) {
      const provider = this.providers.get(providerId)
      if (!provider || !provider.supportsInterval(request.interval)) {
        continue
      }

      const controller = new AbortController()
      const timeout = setTimeout(() => controller.abort(), PRICE_HISTORY_PROVIDER_TIMEOUT_MS)

      try {
        const bars = normalizePriceHistoryBars(await provider.fetchBars(request, controller.signal))
        const result = { providerId, bars }

        if (index > 0) {
          this.logger.info(
            { provider: getProviderName(providerId), bars: bars.length },
            'Price history fallback completed'
          )
        }

        return result
      } catch (err) {
        this.logger.warn({ provider: getProviderName(providerId), err }, 'Price history provider failed')
      } finally {
        clearTimeout(timeout)
      }
    }

    throw new Error('Price history providers failed')
  }
}
