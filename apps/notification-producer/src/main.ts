import {
  CmsPushNotification,
  getPushNotifications,
} from '@cowprotocol/cms-api';
import {
  NOTIFICATIONS_QUEUE,
  Notification,
  stringifyNotification,
} from '@cowprotocol/notifications';
import amqp from 'amqplib/callback_api';
import assert from 'assert';
import Mustache from 'mustache';

// Connect to RabbitMQ server
const queueHost = process.env.QUEUE_HOST;
assert(queueHost, 'QUEUE_HOST is required');
const queuePort = +process.env.QUEUE_PORT || 5672;
const queueUser = process.env.QUEUE_USER;
assert(queueUser, 'QUEUE_USER is required');
const queuePassword = process.env.QUEUE_PASSWORD;
assert(queuePassword, 'QUEUE_PASSWORD is required');

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

      // Name of the queue

      // This makes sure the queue is declared
      channel.assertQueue(NOTIFICATIONS_QUEUE, {
        durable: false,
      });

      // Function to fetch notifications and send them to RabbitMQ
      const fetchNotifications = async () => {
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

      // Fetch notifications every 5 minutes
      setInterval(fetchNotifications, 5 * 60 * 1000);
    });
  }
);

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
