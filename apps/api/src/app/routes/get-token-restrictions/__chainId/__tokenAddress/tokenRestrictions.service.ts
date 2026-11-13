import { getAddressKey } from '@cowprotocol/cow-sdk'
import { AllChainIds } from '@cowprotocol/shared'

export const RESTRICTED_TOKEN_LISTS_URL = 'https://cms.cow.fi/api/restricted-token-lists?pagination[pageSize]=100'

const FETCH_TIMEOUT_MS = 10_000

export interface RestrictedTokenList {
  name: string
  tokenListUrl: string
  restrictedCountries: string[]
}

export type TokenRestriction = { restricted: true; tokenList: string } | { restricted: false }

interface Logger {
  info(msg: string): void
  error(obj: unknown, msg?: string): void
}

interface CmsRestrictedTokenListsResponse {
  data?: { attributes?: Partial<RestrictedTokenList> }[]
}

interface TokenListResponse {
  tokens?: { chainId?: unknown; address?: unknown }[]
}

interface TokenRule {
  listName: string
  restrictedCountries: Set<string>
}

const SUPPORTED_CHAIN_IDS = new Set<number>(AllChainIds)

function getTokenKey(chainId: number, address: string): string {
  return `${chainId}:${getAddressKey(address)}`
}

async function fetchJson<T>(url: string): Promise<T> {
  const response = await globalThis.fetch(url, { signal: AbortSignal.timeout(FETCH_TIMEOUT_MS) })

  if (!response.ok) {
    throw new Error(`Failed to fetch ${url}: ${response.status}`)
  }

  return (await response.json()) as T
}

/** Minimum interval between CMS refetches */
export const REFRESH_INTERVAL_MS = 15 * 60 * 1000

/**
 * Loads restricted token lists from the CMS (and the tokens of each list) and keeps them in memory.
 * Port of the frontend RestrictedTokensListUpdater.
 *
 * Refresh policy:
 * - until the first successful load, every request awaits a (shared) load attempt
 * - afterwards, a request triggers a background refresh at most once per REFRESH_INTERVAL_MS,
 *   and is answered with the current registry without waiting
 * - a failed refresh keeps the current registry; a token list that fails to load keeps its previous tokens
 * - a load where no token list could be loaded (and none was loaded before) fails
 */
export class TokenRestrictionsService {
  private rulesByToken: Map<string, TokenRule[]> | null = null
  private tokenKeysByListUrl = new Map<string, string[]>()
  private loading: Promise<void> | null = null
  private lastAttemptAt = 0

  constructor(private readonly logger: Logger, private readonly now: () => number = Date.now) {}

  /**
   * Starts loading the lists. Concurrent calls share the same request.
   */
  load(): Promise<void> {
    if (!this.loading) {
      this.lastAttemptAt = this.now()
      this.loading = this.fetchRules()
        .then((rules) => {
          this.rulesByToken = rules
        })
        .finally(() => {
          this.loading = null
        })
    }

    return this.loading
  }

  async getRestriction(chainId: number, tokenAddress: string, countryCode: string): Promise<TokenRestriction> {
    if (!this.rulesByToken) {
      await this.load()
    } else if (this.now() - this.lastAttemptAt >= REFRESH_INTERVAL_MS) {
      this.load().catch((error) => this.logger.error(error, 'Failed to refresh restricted token lists'))
    }

    const rules = this.rulesByToken?.get(getTokenKey(chainId, tokenAddress))
    const country = countryCode.toUpperCase()
    const matched = rules?.find((rule) => rule.restrictedCountries.has(country))

    return matched ? { restricted: true, tokenList: matched.listName } : { restricted: false }
  }

  private async fetchRules(): Promise<Map<string, TokenRule[]>> {
    const lists = await this.fetchRestrictedTokenLists()
    const tokenKeysPerList = await Promise.all(lists.map((list) => this.fetchTokenKeys(list)))

    // Geoblocking must never silently turn itself off, so having no list data at all is treated as a failure
    if (tokenKeysPerList.every((tokenKeys) => tokenKeys === undefined)) {
      throw new Error('None of the restricted token lists could be loaded')
    }

    const rulesByToken = new Map<string, TokenRule[]>()
    const tokenKeysByListUrl = new Map<string, string[]>()

    // Build the registry in CMS order, so that the first matching list is deterministic
    lists.forEach((list, index) => {
      const tokenKeys = tokenKeysPerList[index]
      if (!tokenKeys) return

      tokenKeysByListUrl.set(list.tokenListUrl, tokenKeys)

      const rule: TokenRule = {
        listName: list.name,
        restrictedCountries: new Set(list.restrictedCountries.map((country) => country.toUpperCase())),
      }

      for (const key of tokenKeys) {
        const existing = rulesByToken.get(key)

        if (existing) {
          existing.push(rule)
        } else {
          rulesByToken.set(key, [rule])
        }
      }
    })

    this.tokenKeysByListUrl = tokenKeysByListUrl
    this.logger.info(`Loaded ${rulesByToken.size} restricted tokens from ${lists.length} token lists`)

    return rulesByToken
  }

  /**
   * Returns the token keys of a list, or the previously loaded ones if the list can't be fetched
   */
  private async fetchTokenKeys(list: RestrictedTokenList): Promise<string[] | undefined> {
    try {
      const { tokens } = await fetchJson<TokenListResponse>(list.tokenListUrl)

      if (!Array.isArray(tokens)) {
        throw new Error(`Invalid token list response from ${list.tokenListUrl}: tokens is not an array`)
      }

      return tokens.flatMap(({ chainId, address }) => {
        if (typeof chainId !== 'number' || typeof address !== 'string') return []
        if (!SUPPORTED_CHAIN_IDS.has(chainId)) return []

        return [getTokenKey(chainId, address)]
      })
    } catch (error) {
      const previous = this.tokenKeysByListUrl.get(list.tokenListUrl)
      this.logger.error(
        error,
        `Failed to fetch restricted token list "${list.name}"${previous ? ', keeping previously loaded tokens' : ''}`
      )

      return previous
    }
  }

  private async fetchRestrictedTokenLists(): Promise<RestrictedTokenList[]> {
    const { data } = await fetchJson<CmsRestrictedTokenListsResponse>(RESTRICTED_TOKEN_LISTS_URL)

    // Geoblocking must never silently turn itself off, so an empty response is treated as a failure
    if (!Array.isArray(data) || data.length === 0) {
      throw new Error('Restricted token lists response had no data')
    }

    return data.flatMap(({ attributes }) => {
      if (
        !attributes ||
        typeof attributes.name !== 'string' ||
        typeof attributes.tokenListUrl !== 'string' ||
        !Array.isArray(attributes.restrictedCountries)
      ) {
        return []
      }

      return [
        {
          name: attributes.name,
          tokenListUrl: attributes.tokenListUrl,
          restrictedCountries: attributes.restrictedCountries,
        },
      ]
    })
  }
}
