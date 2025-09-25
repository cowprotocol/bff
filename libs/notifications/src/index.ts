import { Channel, Connection } from 'amqplib';

export interface PushNotification {
  id: string;
  account: string;
  title: string;
  message: string;
  url?: string;
  context?: Record<string, string>;
}

export interface ConnectToQueueParams {
  channel?: string;
}

export interface ConnectToChannelResponse {
  connection: Connection;
  channel: Channel;
}

export interface SendToQueueParams {
  channel: Channel;
  queue: string;
  notifications: PushNotification[];
}

export function parseNotifications(
  notificationsString: string
): PushNotification[] {
  const notifications = JSON.parse(notificationsString);
  if (!isNotificationArray(notifications)) {
    throw new Error(
      `The parsed message is not a valid notification array. Message: ${notificationsString}`
    );
  }

  return notifications;
}

export function stringifyNotifications(
  notifications: PushNotification[]
): string {
  return JSON.stringify(notifications);
}

export function isNotificationArray(
  notifications: unknown
): notifications is PushNotification[] {
  return Array.isArray(notifications) && notifications.every(isNotification);
}

export function isNotification(
  notification: unknown
): notification is PushNotification {
  if (typeof notification !== 'object' || notification === null) {
    return false;
  }

  const record = notification as Record<string, unknown>;

  return (
    typeof record.id === 'string' &&
    typeof record.account === 'string' &&
    typeof record.title === 'string' &&
    typeof record.message === 'string'
  );
}
