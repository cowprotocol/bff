import {
  CmsPushNotification,
  getPushNotifications,
} from '@cowprotocol/cms-api';
import {
  NOTIFICATIONS_QUEUE,
  Notification,
  sleep,
  connectToChannel,
  sendNotificationToQueue,
} from '@cowprotocol/notifications';
import { Channel } from 'amqplib';
import Mustache from 'mustache';

const SLEEP_TIME = 5000;
const CHECK_TIME = 30 * 1000; // 30s

async function fetchNotifications(channel: Channel) {
  console.log('[notification-producer] Fetch and post notifications');
  const cmsPushNotifications = await getPushNotifications();

  const pushNotifications = cmsPushNotifications.map(fromCmsToNotifications);

  for (const notification of pushNotifications) {
    console.log(
      '[notification-producer] Post notification to queue',
      notification
    );
    sendNotificationToQueue({
      channel,
      queue: NOTIFICATIONS_QUEUE,
      notification,
    });
  }
}

async function main() {
  const channel = await connectToChannel({
    channel: NOTIFICATIONS_QUEUE,
  });

  return fetchNotifications(channel);
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

async function logAndReconnect(error): Promise<void> {
  console.error('[notification-producer] Error ', error);

  console.log(
    `[notification-producer] Reconnecting in ${SLEEP_TIME / 1000}s...`
  );
  await sleep(SLEEP_TIME);
  return mainLoop();
}

async function waitAndFetch() {
  await sleep(CHECK_TIME);
  return mainLoop();
}

function mainLoop() {
  return main().then(waitAndFetch).catch(logAndReconnect);
}

// Start the main loop
mainLoop();
