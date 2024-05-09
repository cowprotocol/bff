import {
  CmsPushNotification,
  getPushNotifications,
} from '@cowprotocol/cms-api';
import {
  NOTIFICATIONS_QUEUE,
  Notification,
  stringifyNotification,
  sleep,
  connectToQueue,
} from '@cowprotocol/notifications';
import Mustache from 'mustache';

const SLEEP_TIME = 5000;

async function main() {
  const channel = await connectToQueue({
    channel: NOTIFICATIONS_QUEUE,
  });

  console.log('[notification-producer] Ready to start fetching notifications');

  // Function to fetch notifications and send them to RabbitMQ
  const fetchNotifications = async () => {
    console.log('[notification-producer] Fetching notifications');

    try {
      const cmsPushNotifications = await getPushNotifications();

      const pushNotifications = cmsPushNotifications.map(
        fromCmsToNotifications
      );

      for (const notification of pushNotifications) {
        const message = stringifyNotification(notification);
        channel.sendToQueue(NOTIFICATIONS_QUEUE, Buffer.from(message));
      }
    } catch (error) {
      console.log(
        '[notification-producer] Error fetching notifications',
        error
      );
    }
  };

  // Fetch notifications every 30s
  setInterval(fetchNotifications, 30 * 1000);
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
    url,
  };
}

async function logErrorAndReconnect(error): Promise<void> {
  console.error('[notification-producer] Error ', error);

  console.log(
    `[notification-producer] Reconnecting in ${SLEEP_TIME / 1000}s...`
  );
  await sleep(SLEEP_TIME);
  return main().catch(logErrorAndReconnect);
}

// Start the main function
main().catch(logErrorAndReconnect);
