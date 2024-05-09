import { CmsClient, components } from '@cowprotocol/cms';
import assert from 'assert';

type Schemas = components['schemas'];
export type CmsNotification = Schemas['NotificationListResponseDataItem'];
export type CmsNotificationResponse = Schemas['NotificationListResponse'];
export type CmsTelegramSubscription = {
  id: number;
  account: string;
  chat_id: string;
};
export type CmsTelegramSubscriptionsResponse =
  Schemas['TelegramSubscriptionResponse'];
export type CmsPushNotification = {
  id: number;
  account: string;
  data: object;
  createdAt: string;
  updatedAt: string;
  notification_template: {
    id: null | number;
    title: string;
    description: string;
    url: null | string;
    push: boolean;
    thumbnail: null | string;
  };
};

const cmsBaseUrl = process.env.CMS_BASE_URL;
assert(cmsBaseUrl, 'CMS_BASE_URL is required');
const cmsApiKey = process.env.CMS_API_KEY;
assert(cmsApiKey, 'CMS_API_KEY is required');

const cmsClient = CmsClient({
  url: cmsBaseUrl,
  apiKey: cmsApiKey,
});

const PAGE_SIZE = 50;

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

type PaginationParam = {
  page?: number;
  pageSize?: number;
};

async function getNotificationsPage({
  page = 0,
  pageSize = PAGE_SIZE,
}: PaginationParam = {}): Promise<CmsNotification[]> {
  const { data, error, response } = await cmsClient.GET('/notifications', {
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

export async function getAllTelegramSubscriptionsForAccounts(
  accounts: string[]
): Promise<CmsTelegramSubscription[]> {
  const allSubscriptions = [];
  let page = 0;

  let subscriptions = await getTelegramSubscriptionsForAccounts({
    page,
    pageSize: PAGE_SIZE + 1,
    accounts,
  }); // Get one extra to check if there's more pages

  allSubscriptions.push(
    subscriptions.length > PAGE_SIZE
      ? subscriptions.slice(0, -1)
      : subscriptions
  );

  while (subscriptions.length > PAGE_SIZE) {
    subscriptions = await getTelegramSubscriptionsForAccounts({
      page,
      pageSize: PAGE_SIZE + 1,
      accounts,
    }); // Get one extra to check if there's more pages
    const hasMorePages = subscriptions.length > PAGE_SIZE;
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
  const { data, error, response } = await cmsClient.GET(
    `/tg-subscriptions?accounts=${accounts.join(',')}`,
    {
      // Pagination
      'pagination[page]': page,
      'pagination[pageSize]': pageSize,
    }
  );

  console.debug(`[getTelegramSubscriptionsForAccounts] accounts`, accounts);
  console.debug(`[getTelegramSubscriptionsForAccounts] data`, data);

  if (error) {
    console.error(
      `Error ${response.status} getting telegram subscriptions: ${response.url}. Page${page}`,
      error
    );
    throw error;
  }

  return data;
}

export async function getPushNotifications(): Promise<CmsPushNotification[]> {
  return _getPushNotifications();
}

async function _getPushNotifications(): Promise<CmsPushNotification[]> {
  const { data, error, response } = await cmsClient.GET('/push-notifications');

  console.debug(`[_getPushNotifications] data`, data);

  if (error) {
    console.error(
      `Error ${response.status} getting push-notifications: ${response.url}`,
      error
    );
    throw error;
  }

  return data;
}
