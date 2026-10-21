import { logger } from '@cowprotocol/shared'
import { getCmsClient } from '../../datasources/cms'
import {
  CmsPushNotification,
  CmsTelegramSubscription,
  CmsTelegramSubscriptions,
  NotificationModel,
} from './PushSubscriptionsRepository'

import { PushSubscriptionsRepository } from './PushSubscriptionsRepository'

export const PAGE_SIZE = 100
const MAX_PAGES = 1000
const CACHE_TIME = 30000
const CMS_REQUEST_TIMEOUT_MS = 10_000

/**
 * Repository to keep track of subscribed accounts for push notifications.
 *
 * Uses the CMS to retrieve the subscriptions
 */
export class PushSubscriptionsRepositoryCms implements PushSubscriptionsRepository {
  private lastCheck: number | null = null
  private cachedAccounts: string[] | null = null

  async getAllSubscribedAccounts(): Promise<string[]> {
    const now = Date.now()
    if (!this.cachedAccounts || !this.lastCheck || now - this.lastCheck > CACHE_TIME) {
      const accounts = uniqueLowercase(await getAllSubscribedAccounts())
      // The cache refreshes every 30s, so only log when the watched set actually changes
      if (accounts.length !== this.cachedAccounts?.length) {
        logger.info(`[PushSubscriptionsRepositoryCms] Watching ${accounts.length} subscribed account(s)`)
      }
      this.cachedAccounts = accounts
      this.lastCheck = now
      return this.cachedAccounts
    }
    return this.cachedAccounts || []
  }

  async getAllTelegramSubscriptionsForAccounts(accounts: string[]): Promise<CmsTelegramSubscription[]> {
    return getTelegramSubscriptionsForAccounts(accounts)
  }

  async getTelegramSubscriptionsForChatId(chatId: number): Promise<CmsTelegramSubscription[]> {
    return callCmsInternalEndpoint<CmsTelegramSubscription[]>('/telegram-subscription/accounts-by-chat-via-bot', {
      chatId,
    })
  }

  async getPushNotifications(): Promise<CmsPushNotification[]> {
    const { data, error, response } = await getCmsClient().GET('/push-notifications')

    if (error) {
      console.error(`Error ${response.status} getting push-notifications: ${response.url}`, error)
      throw error
    }

    return data
  }

  async getNotificationsByAccount(params: { account: string }): Promise<NotificationModel[]> {
    const { account } = params
    const { data, error, response } = await getCmsClient().GET('/notification-list/' + account)

    if (error) {
      console.error(`Error ${response.status} getting notifications: ${response.url}`, error)
      throw error
    }

    return data
  }

  async linkTelegramSubscription(params: {
    account: string
    chatId: number
    firstName?: string
    username?: string
  }): Promise<void> {
    await postToCmsInternalEndpoint('/telegram-subscription/link-via-bot', params)
  }

  async unlinkTelegramSubscription(params: { account: string; chatId: number }): Promise<void> {
    await postToCmsInternalEndpoint('/telegram-subscription/unlink-via-bot', params)
  }
}

function uniqueLowercase(items: string[]): string[] {
  return Array.from(new Set(items.map((item) => item.toLowerCase())))
}

export async function getAllSubscribedAccounts(): Promise<string[]> {
  const accounts: string[] = []

  for (let page = 1; page <= MAX_PAGES; page++) {
    const subscriptions = await getSubscriptionsPage(page)

    for (const subscription of subscriptions) {
      const account = subscription?.attributes?.account
      if (account) {
        accounts.push(account)
      }
    }

    if (subscriptions.length < PAGE_SIZE) {
      return accounts
    }
  }

  throw new Error(`More than ${MAX_PAGES} pages of telegram subscriptions, giving up`)
}

async function getSubscriptionsPage(page: number): Promise<CmsTelegramSubscriptions[]> {
  const { data, error, response } = await getCmsClient().GET('/telegram-subscriptions', {
    params: {
      query: {
        'pagination[page]': page,
        'pagination[pageSize]': PAGE_SIZE,
        sort: 'id:asc',
      },
    },
  })

  if (error) {
    console.error(`Error ${response.status} getting telegram subscriptions: ${response.url}. Page${page}`, error)
    throw error
  }

  return data.data as CmsTelegramSubscriptions[]
}

// This CMS controller ignores pagination and returns every match, so one request is enough
async function getTelegramSubscriptionsForAccounts(accounts: string[]): Promise<CmsTelegramSubscription[]> {
  const { data, error, response } = await getCmsClient().GET(`/accounts/${accounts.join(',')}/subscriptions/telegram`)

  if (error) {
    console.error(`Error ${response.status} getting telegram subscriptions: ${response.url}`)
    throw error
  }

  return data
}

// TODO: switch to the typed `getCmsClient()` once @cowprotocol/cms is regenerated/published
// with these routes — see docs/superpowers/plans/2026-08-18-telegram-bot-deeplink-backend.md
async function postToCmsInternalEndpoint(path: string, body: Record<string, unknown>): Promise<void> {
  await callCmsInternalEndpoint(path, body)
}

async function callCmsInternalEndpoint<T>(path: string, body: Record<string, unknown>): Promise<T> {
  const cmsBaseUrl = process.env.CMS_BASE_URL
  const cmsApiKey = process.env.CMS_API_KEY

  if (!cmsBaseUrl) {
    throw new Error('CMS_BASE_URL is not set')
  }

  if (!cmsApiKey) {
    throw new Error('CMS_API_KEY is not set')
  }

  // The same signal aborts both the request and an in-flight response.text() read below,
  // so a stalled CMS connection can't leave this pending indefinitely.
  const signal = AbortSignal.timeout(CMS_REQUEST_TIMEOUT_MS)

  const response = await fetch(`${cmsBaseUrl}${path}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      // These routes aren't public by default in Strapi - the same CMS_API_KEY used by
      // getCmsClient() elsewhere is enough to reach them.
      Authorization: `Bearer ${cmsApiKey}`,
    },
    body: JSON.stringify(body),
    signal,
  })

  const text = await response.text()

  if (!response.ok) {
    throw new Error(`CMS request to ${path} failed with ${response.status}: ${text}`)
  }

  return text ? (JSON.parse(text) as T) : (undefined as T)
}
