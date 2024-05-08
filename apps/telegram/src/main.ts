// console.log('Hello World');

import TelegramBot from 'node-telegram-bot-api';

import { CmsClient, components } from '@cowprotocol/cms';
import amqp from 'amqplib/callback_api';
import {
  NOTIFICATIONS_QUEUE,
  parseNotification,
  Notification,
} from '@cowprotocol/notifications';
import assert from 'assert';

type Schemas = components['schemas'];
export type Article = Schemas['ArticleListResponseDataItem'];
export type SharedMediaComponent = Schemas['SharedMediaComponent'];
export type SharedQuoteComponent = Schemas['SharedQuoteComponent'];
export type SharedRichTextComponent = Schemas['SharedRichTextComponent'];
export type SharedSliderComponent = Schemas['SharedSliderComponent'];
export type SharedVideoEmbedComponent = Schemas['SharedVideoEmbedComponent'];
export type Category = Schemas['CategoryListResponseDataItem'];

// TODO: Fix me. Types from CMS are not being imported correctly! declaring this should not be necesary
interface TelegramSubscription {
  chatId: number;
  code: string;
}

const subscriptions = new Map<string, TelegramSubscription[]>();

// Create telegram bot
const token = process.env.TELEGRAM_SECRET;
assert(token, 'TELEGRAM_SECRET is required');
const bot = new TelegramBot(token, { polling: true });

// Create CMS client
const cmsBaseUrl = process.env.CMS_BASE_URL;
assert(cmsBaseUrl, 'CMS_BASE_URL is required');
const cmsApiKey = process.env.STRAPI_API_KEY;
assert(cmsApiKey, 'CMS_API_KEY is required');
const cmsClient = CmsClient({
  url: cmsBaseUrl,
  apiKey: cmsApiKey,
});

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
        function (msg) {
          const notification = parseNotification(msg.content.toString());
          const { id, message, account, title, url } = notification;
          console.log(
            `[telegram-consumer] New Notification ${id} for ${account}. ${title}: ${message}. URL=${url}`
          );

          // TODO: Don't check every time!!
          // Check in CMS if there's one
          const subscriptionForAccount = cmsClient.GET(
            `/tg-subscriptions/${account}`
          ) as TelegramSubscription[];
          subscriptions.set(account, subscriptionForAccount);

          const telegramSubscriptions = subscriptions.get(account);
          if (telegramSubscriptions.length > 0) {
            // Send the message to all subscribers
            for (const { chatId } of telegramSubscriptions) {
              console.log(
                `[telegram-consumer] Sending message ${id} to chatId ${chatId}`
              );
              bot.sendMessage(chatId, formatMessage(notification));
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
