import { Channel, Connection } from 'amqplib';

export interface PushNotification {
  id: string;
  account: string;
  title: string;
  message: string;
  url?: string;
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
  return JSON.parse(notificationsString);
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
  return (
    typeof notification === 'object' &&
    notification !== null &&
    'id' in notification &&
    'account' in notification &&
    'title' in notification &&
    'message' in notification
  );
}
