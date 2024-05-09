import {
  CmsTelegramSubscription,
  getAllTelegramSubscriptionsForAccounts,
} from '@cowprotocol/cms-api';
import {
  NOTIFICATIONS_QUEUE,
  Notification,
  parseNotification,
} from '@cowprotocol/notifications';
import amqp from 'amqplib/callback_api';
import assert from 'assert';
import TelegramBot from 'node-telegram-bot-api';

const SUBSCRIPTION_CACHE = new Map<string, CmsTelegramSubscription[]>();

// Create telegram bot
const token = process.env.TELEGRAM_SECRET;
assert(token, 'TELEGRAM_SECRET is required');
const telegramBot = new TelegramBot(token, { polling: true });

// Connect to RabbitMQ server
const queueHost = process.env.QUEUE_HOST;
assert(queueHost, 'QUEUE_HOST is required');
const queuePort = process.env.QUEUE_PORT || 5672;

amqp.connect(
  'amqp://' + queueHost + ':' + queuePort,
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

      console.log(
        '[telegram-consumer] Waiting for messages in %s',
        NOTIFICATIONS_QUEUE
      );

      // Consume messages from RabbitMQ
      channel.consume(
        NOTIFICATIONS_QUEUE,
        async function (msg) {
          const notification = parseNotification(msg.content.toString());
          const { id, message, account, title, url } = notification;
          console.log(
            `[telegram-consumer] New Notification ${id} for ${account}. ${title}: ${message}. URL=${url}`
          );

          // TODO: Don't check every time!!
          // Check in CMS if there's one
          const subscriptionForAccount =
            await getAllTelegramSubscriptionsForAccounts([account]);

          SUBSCRIPTION_CACHE.set(account, subscriptionForAccount);

          const telegramSubscriptions = SUBSCRIPTION_CACHE.get(account);
          if (telegramSubscriptions.length > 0) {
            // Send the message to all subscribers
            for (const { attributes } of telegramSubscriptions) {
              const { chat_id: chatId } = attributes;
              console.log(
                `[telegram-consumer] Sending message ${id} to chatId ${chatId}`
              );
              telegramBot.sendMessage(chatId, formatMessage(notification));
            }
          } else {
            console.log(
              `[telegram-consumer] No subscriptions found for account ${account}`
            );
          }
        },
        {
          noAck: true,
        }
      );
    });
  }
);

function formatMessage({ title, message, url }: Notification) {
  return `\
${title}

${message}

${
  url &&
  `

More info in ${url}`
}`;
}
