import { getCacheKey } from '@cowprotocol/repositories'
import { FastifyInstance } from 'fastify'

import type {} from '@fastify/caching'

export const CACHE_CONTROL_HEADER = 'cache-control'

export interface CachedItem {
  stored: number
  ttl: number
  item: unknown
}

// TODO: Implement using decorators instead of utility functions
export async function getCache(key: string, fastify: FastifyInstance): Promise<CachedItem | undefined> {
  return new Promise<CachedItem | undefined>((resolve, reject) => {
    fastify.cache.get(key, (err: unknown, value: unknown) => {
      if (err) {
        reject(err)
      }

      if (!value) {
        resolve(undefined)
      } else if (!isCachedItem(value)) {
        reject(new Error('Value is not a CachedItem'))
      } else {
        resolve(value)
      }
    })
  })
}

// TODO: Implement using decorators instead of utility functions
export async function setCache(
  key: string,
  value: unknown,
  timeToLive: number,
  fastify: FastifyInstance
): Promise<void> {
  return new Promise((resolve, reject) => {
    fastify.cache.set(key, value, timeToLive * 1000, (err: unknown, value: unknown) => {
      if (err) {
        reject(err)
      } else {
        resolve()
      }
    })
  })
}

function isCachedItem(value: unknown): value is CachedItem {
  return typeof value === 'object' && value !== null && 'stored' in value && 'ttl' in value && 'item' in value
}

export function getCacheControlHeaderValue(ttl: number, ttlSharedCache?: number) {
  return `max-age=${ttl}, public, s-maxage=${ttlSharedCache || ttl}`
}

type Directives = { [key: string]: string }

export function parseCacheControlHeaderValue(headerValue?: string | number | string[]): Directives {
  if (!headerValue || typeof headerValue !== 'string') {
    return {}
  }

  const directivesResult: Directives = {}

  const parts = headerValue.split(',')
  parts.forEach((part) => {
    const trimmedPart = part.trim()
    if (trimmedPart.includes('=')) {
      const [key, value] = trimmedPart.split('=')
      directivesResult[key] = value
    } else {
      directivesResult[trimmedPart] = 'true'
    }
  })

  return directivesResult
}

/** Clients poll with `to` set to `now` at second resolution, so an unrounded key never hits. */
const TIMESTAMP_GRID_SECONDS = 30
const TIMESTAMP_PARAMS = ['from', 'to']

/** Cache key for a request URL, with timestamp params rounded so polling clients share an entry. */
export function getRequestCacheKey(url: string): string {
  return getCacheKey('requests', ...roundTimestampParams(url).split('/'))
}

function roundTimestampParams(url: string): string {
  const queryStart = url.indexOf('?')
  if (queryStart === -1) {
    return url
  }

  const params = new URLSearchParams(url.slice(queryStart + 1))
  let rounded = false

  for (const name of TIMESTAMP_PARAMS) {
    const value = params.get(name)
    if (value === null || !/^\d+$/.test(value)) {
      continue
    }

    params.set(name, String(Math.floor(Number(value) / TIMESTAMP_GRID_SECONDS) * TIMESTAMP_GRID_SECONDS))
    rounded = true
  }

  return rounded ? `${url.slice(0, queryStart)}?${params}` : url
}
