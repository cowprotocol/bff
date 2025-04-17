import {
  CmsPushNotification,
  getPushNotifications,
} from '@cowprotocol/cms-api';
import { Notification } from '@cowprotocol/notifications';
import { NotificationsRepository } from '../NotificationsRepository';
import { doForever } from '../utils';
import Mustache from 'mustache';
import { Runnable } from '../../types';

const WAIT_TIME = 30000;

export class CmsNotificationProducer implements Runnable {
  /**
   * This in-memory state just adds some resilience in case there's an error posting the message.
   * Because the PUSH notifications are currently consumed just by reading, in case of a failure the notification is lost
   *
   * This solution is a patch until we properly implement a more reliable consumption
   */
  pendingNotifications = new Map<string, Notification>();

  constructor(
    private readonly notificationsRepository: NotificationsRepository
  ) {}

  /**
   * Main loop: Run the CMS notification producer. This method runs indefinitely,
   * fetching notifications and sending them to the queue.
   *
   * The method should not throw or finish.
   */
  async start(): Promise<void> {
    doForever(
      'notification-producer',
      async () => {
        await this.fetchAndSend();
      },
      WAIT_TIME
    );
  }

  async fetchAndSend(): Promise<void> {
    // Get PUSH notifications
    const cmsPushNotifications = await getPushNotifications();
    const pendingNotifications = Array.from(this.pendingNotifications.values());
    const pushNotifications = cmsPushNotifications
      .map(fromCmsToNotifications)
      .concat(pendingNotifications);

    if (pushNotifications.length === 0) {
      return;
    }

    console.debug(
      `[notification-producer:main] ${pushNotifications.length} new PUSH notifications`
    );

    // Save notifications in-memory, so they are not lost if there's an issue with the queue
    pushNotifications.forEach((notification) =>
      this.pendingNotifications.set(notification.id, notification)
    );

    // Connect
    await this.notificationsRepository.connect();

    // Post notifications to queue
    this.notificationsRepository.sendNotifications(pushNotifications);
    this.pendingNotifications.clear();
  }
}

function fromCmsToNotifications({
  id,
  account,
  data,
  notification_template: { title, description, url },
}: CmsPushNotification): Notification {
  const message = Mustache.render(description, data);

  return {
    id: id.toString(),
    title,
    message,
    account,
    url: url || undefined,
  };
}
