import { getCmsClient } from '../../datasources/cms';
import {
  CmsNotification,
  CmsPushNotification,
  CmsTelegramSubscription,
  CmsTelegramSubscriptions,
  NotificationModel,
} from './PushSubscriptionsRepository';

import { PushSubscriptionsRepository } from './PushSubscriptionsRepository';

const PAGE_SIZE = 50;
const CACHE_TIME = 30000;

type PaginationParam = {
  page?: number;
  pageSize?: number;
};

/**
 * Repository to keep track of subscribed accounts for push notifications.
 *
 * Uses the CMS to retrieve the subscriptions
 */
export class PushSubscriptionsRepositoryCms
  implements PushSubscriptionsRepository
{
  private lastCheck: number | null = null;
  private cachedAccounts: string[] | null = null;

  async getAllSubscribedAccounts(): Promise<string[]> {
    const now = Date.now();
    if (
      !this.cachedAccounts ||
      !this.lastCheck ||
      now - this.lastCheck > CACHE_TIME
    ) {
      this.cachedAccounts = uniqueLowercase(await getAllSubscribedAccounts());
      this.lastCheck = now;
      return this.cachedAccounts;
    }
    return this.cachedAccounts || [];
  }

  async getAllTelegramSubscriptionsForAccounts(
    accounts: string[]
  ): Promise<CmsTelegramSubscription[]> {
    return getAllPages({
      pageSize: PAGE_SIZE,
      getPage: (params) =>
        getTelegramSubscriptionsForAccounts({
          ...params,
          accounts,
        }),
    });
  }

  async getPushNotifications(): Promise<CmsPushNotification[]> {
    const { data, error, response } = await getCmsClient().GET(
      '/push-notifications'
    );

    if (error) {
      console.error(
        `Error ${response.status} getting push-notifications: ${response.url}`,
        error
      );
      throw error;
    }

    return data;
  }

  async getNotificationsByAccount(params: {
    account: string;
  }): Promise<NotificationModel[]> {
    const { account } = params;
    const { data, error, response } = await getCmsClient().GET(
      '/notification-list/' + account
    );

    if (error) {
      console.error(
        `Error ${response.status} getting notifications: ${response.url}`,
        error
      );
      throw error;
    }

    return data;
  }
}

function uniqueLowercase(items: string[]): string[] {
  return Array.from(new Set(items.map((item) => item.toLowerCase())));
}

export async function getAllNotifications(): Promise<CmsNotification[]> {
  const allNotifications = [];
  let page = 0;

  let notifications = await getNotificationsPage({
    page,
    pageSize: PAGE_SIZE + 1,
  }); // Get one extra to check if there's more pages

  allNotifications.push(
    notifications.length > PAGE_SIZE
      ? notifications.slice(0, -1)
      : notifications
  );

  while (notifications.length > PAGE_SIZE) {
    notifications = await getNotificationsPage({
      page,
      pageSize: PAGE_SIZE + 1,
    }); // Get one extra to check if there's more pages
    const hasMorePages = notifications.length > PAGE_SIZE;
    allNotifications.push(
      hasMorePages ? notifications.slice(0, -1) : notifications
    );

    if (!hasMorePages) {
      break;
    }

    // Keep fetching while there's more pages
    page++;
  }

  return allNotifications.flat();
}

/**
 * Get a page of notifications from the CMS
 *
 * @param params - The pagination parameters
 * @returns The notifications
 */
async function getNotificationsPage({
  page = 0,
  pageSize = PAGE_SIZE,
}: PaginationParam = {}): Promise<CmsNotification[]> {
  const { data, error, response } = await getCmsClient().GET('/notifications', {
    'populate[0]': 'notification_template',

    // Pagination
    'pagination[page]': page,
    'pagination[pageSize]': pageSize,
  });

  if (error) {
    console.error(
      `Error ${response.status} getting notifications: ${response.url}. Page${page}`,
      error
    );
    throw error;
  }

  return data.data;
}

export async function getAllSubscribedAccounts(): Promise<string[]> {
  return getAllPages({
    pageSize: PAGE_SIZE,
    getPage: (params) => getSubscribedAccounts(params),
  });
}

async function getAllPages<T>({
  pageSize = PAGE_SIZE,
  getPage,
}: PaginationParam & {
  getPage: (params: PaginationParam) => Promise<T[]>;
}): Promise<T[]> {
  const allSubscriptions = [];
  let page = 0;

  let subscriptions = await getPage({
    page,
    pageSize: pageSize + 1,
  }); // Get one extra to check if there's more pages

  allSubscriptions.push(
    subscriptions.length > pageSize ? subscriptions.slice(0, -1) : subscriptions
  );

  while (subscriptions.length > pageSize) {
    subscriptions = await getPage({
      page,
      pageSize: pageSize + 1,
    }); // Get one extra to check if there's more pages
    const hasMorePages = subscriptions.length > pageSize;
    allSubscriptions.push(
      hasMorePages ? subscriptions.slice(0, -1) : subscriptions
    );

    if (!hasMorePages) {
      break;
    }

    // Keep fetching while there's more pages
    page++;
  }

  return allSubscriptions.flat();
}

async function getTelegramSubscriptionsForAccounts({
  page = 0,
  pageSize = PAGE_SIZE,
  accounts,
}: PaginationParam & { accounts: string[] }): Promise<
  CmsTelegramSubscription[]
> {
  const { data, error, response } = await getCmsClient().GET(
    `/accounts/${accounts.join(',')}/subscriptions/telegram`,
    {
      // Pagination
      'pagination[page]': page,
      'pagination[pageSize]': pageSize,
    }
  );

  if (error) {
    console.error(
      `Error ${response.status} getting telegram subscriptions: ${response.url}. Page${page}`
    );
    throw error;
  }

  return data;
}

async function getSubscribedAccounts({
  page = 0,
  pageSize = PAGE_SIZE,
}: PaginationParam): Promise<string[]> {
  const { data, error, response } = await getCmsClient().GET(
    `/telegram-subscriptions`,
    {
      // Pagination
      'pagination[page]': page,
      'pagination[pageSize]': pageSize,
    }
  );

  if (error) {
    console.error(
      `Error ${response.status} getting telegram subscriptions: ${response.url}. Page${page}`,
      error
    );
    throw error;
  }

  const subscriptions = data.data as CmsTelegramSubscriptions[];

  return subscriptions.reduce<string[]>((acc, subscription) => {
    const account = subscription?.attributes?.account;
    if (account) {
      acc.push(account);
    }
    return acc;
  }, []);
}
