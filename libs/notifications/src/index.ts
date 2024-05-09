export const NOTIFICATIONS_QUEUE = 'notifications';

export interface Notification {
  id: string;
  account: string;
  title: string;
  message: string;
  url?: string;
}

export function parseNotification(notificationString: string): Notification {
  return JSON.parse(notificationString);
}

export function stringifyNotification(notification: Notification): string {
  return JSON.stringify(notification);
}

// TODO: Move to commons lib
export function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
