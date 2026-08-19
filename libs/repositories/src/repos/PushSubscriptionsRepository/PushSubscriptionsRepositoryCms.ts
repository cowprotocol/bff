import { getCmsClient } from '../../datasources/cms'
import {
  CmsNotification,
  CmsPushNotification,
  CmsTelegramSubscription,
  CmsTelegramSubscriptions,
  NotificationModel,
} from './PushSubscriptionsRepository'

import { PushSubscriptionsRepository } from './PushSubscriptionsRepository'

const PAGE_SIZE = 50
const CACHE_TIME = 30000
const CMS_REQUEST_TIMEOUT_MS = 10_000

type PaginationParam = {
  page?: number
  pageSize?: number
}

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
      this.cachedAccounts = uniqueLowercase(await getAllSubscribedAccounts())
      this.lastCheck = now
      return this.cachedAccounts
    }
    return this.cachedAccounts || []
  }

  async getAllTelegramSubscriptionsForAccounts(accounts: string[]): Promise<CmsTelegramSubscription[]> {
    return getAllPages({
      pageSize: PAGE_SIZE,
      getPage: (params) =>
        getTelegramSubscriptionsForAccounts({
          ...params,
          accounts,
        }),
    })
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

  async unlinkTelegramSubscription(params: { account: string }): Promise<void> {
    await postToCmsInternalEndpoint('/telegram-subscription/unlink-via-bot', params)
  }
}

function uniqueLowercase(items: string[]): string[] {
  return Array.from(new Set(items.map((item) => item.toLowerCase())))
}

export async function getAllNotifications(): Promise<CmsNotification[]> {
  const allNotifications = []
  let page = 0

  let notifications = await getNotificationsPage({
    page,
    pageSize: PAGE_SIZE + 1,
  }) // Get one extra to check if there's more pages

  allNotifications.push(notifications.length > PAGE_SIZE ? notifications.slice(0, -1) : notifications)

  while (notifications.length > PAGE_SIZE) {
    notifications = await getNotificationsPage({
      page,
      pageSize: PAGE_SIZE + 1,
    }) // Get one extra to check if there's more pages
    const hasMorePages = notifications.length > PAGE_SIZE
    allNotifications.push(hasMorePages ? notifications.slice(0, -1) : notifications)

    if (!hasMorePages) {
      break
    }

    // Keep fetching while there's more pages
    page++
  }

  return allNotifications.flat()
}

/**
 * Get a page of notifications from the CMS
 *
 * @param params - The pagination parameters
 * @returns The notifications
 */
async function getNotificationsPage({ page = 0, pageSize = PAGE_SIZE }: PaginationParam = {}): Promise<
  CmsNotification[]
> {
  const { data, error, response } = await getCmsClient().GET('/notifications', {
    'populate[0]': 'notification_template',

    // Pagination
    'pagination[page]': page,
    'pagination[pageSize]': pageSize,
  })

  if (error) {
    console.error(`Error ${response.status} getting notifications: ${response.url}. Page${page}`, error)
    throw error
  }

  return data.data
}

export async function getAllSubscribedAccounts(): Promise<string[]> {
  return getAllPages({
    pageSize: PAGE_SIZE,
    getPage: (params) => getSubscribedAccounts(params),
  })
}

async function getAllPages<T>({
  pageSize = PAGE_SIZE,
  getPage,
}: PaginationParam & {
  getPage: (params: PaginationParam) => Promise<T[]>
}): Promise<T[]> {
  const allSubscriptions = []
  let page = 0

  let subscriptions = await getPage({
    page,
    pageSize: pageSize + 1,
  }) // Get one extra to check if there's more pages

  allSubscriptions.push(subscriptions.length > pageSize ? subscriptions.slice(0, -1) : subscriptions)

  while (subscriptions.length > pageSize) {
    subscriptions = await getPage({
      page,
      pageSize: pageSize + 1,
    }) // Get one extra to check if there's more pages
    const hasMorePages = subscriptions.length > pageSize
    allSubscriptions.push(hasMorePages ? subscriptions.slice(0, -1) : subscriptions)

    if (!hasMorePages) {
      break
    }

    // Keep fetching while there's more pages
    page++
  }

  return allSubscriptions.flat()
}

async function getTelegramSubscriptionsForAccounts({
  page = 0,
  pageSize = PAGE_SIZE,
  accounts,
}: PaginationParam & { accounts: string[] }): Promise<CmsTelegramSubscription[]> {
  const { data, error, response } = await getCmsClient().GET(`/accounts/${accounts.join(',')}/subscriptions/telegram`, {
    // Pagination
    'pagination[page]': page,
    'pagination[pageSize]': pageSize,
  })

  if (error) {
    console.error(`Error ${response.status} getting telegram subscriptions: ${response.url}. Page${page}`)
    throw error
  }

  return data
}

async function getSubscribedAccounts({ page = 0, pageSize = PAGE_SIZE }: PaginationParam): Promise<string[]> {
  const { data, error, response } = await getCmsClient().GET(`/telegram-subscriptions`, {
    // Pagination
    'pagination[page]': page,
    'pagination[pageSize]': pageSize,
  })

  if (error) {
    console.error(`Error ${response.status} getting telegram subscriptions: ${response.url}. Page${page}`, error)
    throw error
  }

  const subscriptions = data.data as CmsTelegramSubscriptions[]

  return subscriptions.reduce<string[]>((acc, subscription) => {
    const account = subscription?.attributes?.account
    if (account) {
      acc.push(account)
    }
    return acc
  }, [])
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
