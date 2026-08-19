import { randomBytes } from 'crypto'

import { CacheRepository } from '@cowprotocol/repositories'

const TOKEN_PREFIX = 'telegram-connect:'
export const CONNECT_TOKEN_TTL_SECONDS = 10 * 60 // 10 minutes

export async function createConnectToken(cacheRepository: CacheRepository, account: string): Promise<string> {
  const token = randomBytes(16).toString('hex')

  await cacheRepository.set(TOKEN_PREFIX + token, account, CONNECT_TOKEN_TTL_SECONDS)

  return token
}

export async function resolveConnectToken(cacheRepository: CacheRepository, token: string): Promise<string | null> {
  const account = await cacheRepository.get(TOKEN_PREFIX + token)

  if (!account) {
    return null
  }

  // Single-use: delete on first successful resolution. CacheRepository has no
  // delete(); overwriting with a 1-second TTL is the smallest available proxy.
  await cacheRepository.set(TOKEN_PREFIX + token, '', 1)

  return account
}
