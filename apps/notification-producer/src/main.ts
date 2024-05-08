import {
  NOTIFICATIONS_QUEUE,
  Notification,
  stringifyNotification,
} from '@cowprotocol/notifications';
import amqp from 'amqplib/callback_api';
import fetch from 'node-fetch';

// URL of the Strapi API endpoint
const API_URL = 'http://localhost:1500/notifications';

// Connect to RabbitMQ server
amqp.connect('amqp://localhost', function (error0, connection) {
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
        const response = await fetch(API_URL);
        const cmsNotifications = (await response.json()) as unknown[];

        // TODO: Convert from CMS to notifications
        const notifications = cmsNotifications.map(fromCmsToNotifications);

        for (const notification of notifications) {
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
});

function fromCmsToNotifications(_notifications: unknown): Notification {
  return {
    id: '1',
    title: 'Hello',
    message: 'World',
  };
}
