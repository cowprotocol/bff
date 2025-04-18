import { CmsClient, components } from '@cowprotocol/cms';

type Schemas = components['schemas'];
export type CmsNotification = Schemas['NotificationListResponseDataItem'];
export type CmsNotificationResponse = Schemas['NotificationListResponse'];
export type CmsTelegramSubscription = {
  account: string;
  chatId: string;
};
export type CmsTelegramSubscriptionsResponse =
  Schemas['TelegramSubscriptionResponse'];

export type CmsTelegramSubscriptions =
  Schemas['TelegramSubscriptionResponse']['data'];

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

// TODO: For now the CMS don't generate this type. Adding it manually for now.
export interface NotificationModel {
  id: number;
  account: string;
  title: string;
  description: string;
  createdAt: string;
  url: string | null;
  thumbnail: string | null;
}

const cmsBaseUrl = process.env.CMS_BASE_URL;

const cmsApiKey = process.env.CMS_API_KEY;
if (!cmsApiKey) {
  console.warn(
    'CMS_API_KEY is not set. Some CMS integrations might not work for lack of permissions.'
  );
}

const cmsClient = CmsClient({
  url: cmsBaseUrl,
  apiKey: cmsApiKey,
});

const PAGE_SIZE = 50;

export async function getNotificationsByAccount({
  account,
}: {
  account: string;
}): Promise<NotificationModel[]> {
  const { data, error, response } = await cmsClient.GET(
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

export async function getAllSubscribedAccounts(): Promise<string[]> {
  return getAllPages({
    pageSize: PAGE_SIZE,
    getPage: (params) => getSubscribedAccounts(params),
  });
}

export async function getAllTelegramSubscriptionsForAccounts(
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
  const { data, error, response } = await cmsClient.GET(
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
  const { data, error, response } = await cmsClient.GET(
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

export async function getPushNotifications(): Promise<CmsPushNotification[]> {
  const { data, error, response } = await cmsClient.GET('/push-notifications');

  if (error) {
    console.error(
      `Error ${response.status} getting push-notifications: ${response.url}`,
      error
    );
    throw error;
  }

  return data;
}
