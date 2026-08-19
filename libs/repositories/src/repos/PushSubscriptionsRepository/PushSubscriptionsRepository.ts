import { components } from '@cowprotocol/cms'

export const pushSubscriptionsRepositorySymbol = Symbol.for('PushSubscriptionsRepository')

type Schemas = components['schemas']
export type CmsNotification = Schemas['NotificationListResponseDataItem']
export type CmsNotificationResponse = Schemas['NotificationListResponse']
export type CmsTelegramSubscription = {
  account: string
  chatId: string
}
export type CmsTelegramSubscriptionsResponse = Schemas['TelegramSubscriptionResponse']

export type CmsTelegramSubscriptions = Schemas['TelegramSubscriptionResponse']['data']

export type CmsPushNotification = {
  id: number
  account: string
  data: Record<string, unknown>
  createdAt: string
  updatedAt: string
  notification_template: {
    id: number
    title: string
    description: string
    url: null | string
    push: boolean
    thumbnail: null | string
  }
}

export interface NotificationModel {
  id: number
  account: string
  title: string
  description: string
  createdAt: string
  url: string | null
  thumbnail: string | null
}

/**
 * Repository to keep track of subscribed accounts for push notifications.
 */
export interface PushSubscriptionsRepository {
  getAllSubscribedAccounts(): Promise<string[]>
  getAllTelegramSubscriptionsForAccounts(accounts: string[]): Promise<CmsTelegramSubscription[]>
  // Unsubscribing only happens from the bot side (see apps/telegram's unsubscribeFlow),
  // since it can prove which Telegram chat is asking - a chat may have linked more than
  // one account, so this lists all of them to build the "which account?" picker.
  getTelegramSubscriptionsForChatId(chatId: number): Promise<CmsTelegramSubscription[]>
  getPushNotifications(): Promise<CmsPushNotification[]>
  getNotificationsByAccount(params: { account: string }): Promise<NotificationModel[]>
  linkTelegramSubscription(params: {
    account: string
    chatId: number
    firstName?: string
    username?: string
  }): Promise<void>
  unlinkTelegramSubscription(params: { account: string }): Promise<void>
}
