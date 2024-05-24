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
  ConnectToChannelResponse,
} from '@cowprotocol/notifications';
import Mustache from 'mustache';

const WAIT_TIME = 30000;

/**
 * This in-memory state just adds some resilience in case there's an error posting the message.
 * Because the PUSH notifications are currently consumed just by reading, in case of a failure the notification is lost
 *
 * This solution is a patch until we properly implement a more reliable consumption
 */
const PENDING_NOTIFICATIONS = new Map<string, Notification>();

async function main(
  connectionParam: ConnectToChannelResponse | null,
  onCloseConnection: () => void
): Promise<ConnectToChannelResponse | null> {
  // Get PUSH notifications
  const cmsPushNotifications = await getPushNotifications();
  const pendingNotifications = Array.from(PENDING_NOTIFICATIONS.values());
  const pushNotifications = cmsPushNotifications
    .map(fromCmsToNotifications)
    .concat(pendingNotifications);

  if (pushNotifications.length === 0) {
    return connectionParam;
  }

  console.debug(
    `[notification-producer:main] ${pushNotifications.length} new PUSH notifications`
  );

  // Save notifications in-memory, so they are not lost if there's an issue with the queue
  pushNotifications.forEach((notification) =>
    PENDING_NOTIFICATIONS.set(notification.id, notification)
  );

  // Connect
  if (!connectionParam) {
    console.debug(
      `[notification-producer:main] Connect to the queue: ${NOTIFICATIONS_QUEUE}`
    );
    connectionParam = await connectToChannel({
      channel: NOTIFICATIONS_QUEUE,
    });

    // Watch for connection close
    connectionParam.connection.on('close', onCloseConnection);
  }
  const { channel } = connectionParam;

  // Post notifications to queue
  for (const notification of pushNotifications) {
    console.log(
      '[notification-producer:main] Post notification to queue',
      notification
    );

    sendNotificationToQueue({
      channel,
      queue: NOTIFICATIONS_QUEUE,
      notification,
    });
    PENDING_NOTIFICATIONS.delete(notification.id);
  }

  return connectionParam;
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

/**
 * Main loop: Run and re-attempt on error
 */
async function mainLoop() {
  console.info('[notification-producer:main] Start notification producer');

  // Keep an open connection. Reset it if the connection is closed
  let connectionParam: ConnectToChannelResponse | null = null;
  const onCloseConnection = () => (connectionParam = null);

  // eslint-disable-next-line no-constant-condition
  while (true) {
    try {
      connectionParam = await main(connectionParam, onCloseConnection);
    } catch (error) {
      console.error('[notification-producer:main] Error ', error);
      console.log(
        `[notification-producer:main] Reconnecting in ${WAIT_TIME / 1000}s...`
      );
    } finally {
      await sleep(WAIT_TIME);
    }
  }
}

// Start the main loop
mainLoop();
