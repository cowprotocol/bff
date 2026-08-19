import { randomBytes } from 'crypto'

import { CacheRepository } from '../repos/CacheRepository/CacheRepository'

const TOKEN_PREFIX = 'telegram-connect:'
export const CONNECT_TOKEN_TTL_SECONDS = 10 * 60 // 10 minutes

export async function createConnectToken(cacheRepository: CacheRepository, account: string): Promise<string> {
  const token = randomBytes(16).toString('hex')

  await cacheRepository.set(TOKEN_PREFIX + token, account, CONNECT_TOKEN_TTL_SECONDS)

  return token
}

/**
 * Atomically claims a connect-token: the underlying get+delete happens in a single step, so
 * under concurrent /start messages for the same token at most one caller ever receives the
 * account back. Returns null if the token doesn't exist, already expired, or was already
 * claimed by another caller.
 */
export async function claimConnectToken(cacheRepository: CacheRepository, token: string): Promise<string | null> {
  return cacheRepository.take(TOKEN_PREFIX + token)
}

/**
 * Restores a claimed token so it can be retried after a failed linking attempt. Only the caller
 * that received `account` back from claimConnectToken() can call this - claiming is a
 * single-winner atomic operation, so nobody else can be holding this same (token, account) pair
 * concurrently. In other words, only the reservation owner can safely release it.
 */
export async function releaseConnectToken(
  cacheRepository: CacheRepository,
  token: string,
  account: string
): Promise<void> {
  await cacheRepository.set(TOKEN_PREFIX + token, account, CONNECT_TOKEN_TTL_SECONDS)
}
