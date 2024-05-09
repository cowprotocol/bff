import {
  CmsPushNotification,
  getPushNotifications,
} from '@cowprotocol/cms-api';
import {
  NOTIFICATIONS_QUEUE,
  Notification,
  stringifyNotification,
  sleep,
} from '@cowprotocol/notifications';
import amqp from 'amqplib/callback_api';
import assert from 'assert';
import Mustache from 'mustache';

const SLEEP_TIME = 5000;

// Connect to RabbitMQ server
const queueHost = process.env.QUEUE_HOST;
assert(queueHost, 'QUEUE_HOST is required');
const queuePort = +process.env.QUEUE_PORT || 5672;
const queueUser = process.env.QUEUE_USER;
assert(queueUser, 'QUEUE_USER is required');
const queuePassword = process.env.QUEUE_PASSWORD;
assert(queuePassword, 'QUEUE_PASSWORD is required');

async function main() {
  // Connect to RabbitMQ server
  amqp.connect(
    {
      hostname: queueHost,
      port: queuePort,
      username: queueUser,
      password: queuePassword,
    },
    function (error0, connection) {
      if (error0) {
        throw error0;
      }

      // Create a channel
      connection.createChannel(function (error1, channel) {
        if (error1) {
          throw error1;
        }

        // This makes sure the queue is declared
        channel.assertQueue(NOTIFICATIONS_QUEUE, {
          durable: false,
        });

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
            console.error(error);
          }
        };

        console.log(
          '[notification-producer] Ready to start fetching notifications'
        );

        // Fetch notifications every 30s
        setInterval(fetchNotifications, 30 * 1000);
      });
    }
  );
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
