import {
  CmsTelegramSubscription,
  getAllTelegramSubscriptionsForAccounts,
} from '@cowprotocol/cms-api';
import {
  NOTIFICATIONS_QUEUE,
  Notification,
  connectToChannel,
  parseNotification,
} from '@cowprotocol/notifications';
import assert from 'assert';
import TelegramBot from 'node-telegram-bot-api';

const SLEEP_TIME = 5000;
const SUBSCRIPTION_CACHE = new Map<string, CmsTelegramSubscription[]>();

// Create telegram bot
const token = process.env.TELEGRAM_SECRET;
assert(token, 'TELEGRAM_SECRET is required');
const telegramBot = new TelegramBot(token, { polling: true });

async function main() {
  const channel = await connectToChannel({
    channel: NOTIFICATIONS_QUEUE,
  });

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
        for (const { chat_id: chatId } of telegramSubscriptions) {
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
}

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

async function logErrorAndReconnect(error): Promise<void> {
  console.error('[telegram] Error ', error);
  console.log(
    `[notification-producer] Reconnecting in ${SLEEP_TIME / 1000}s...`
  );
  return main().catch(logErrorAndReconnect);
}

// Start the main function
main().catch(logErrorAndReconnect);
