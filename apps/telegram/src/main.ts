import ms from 'ms';

import {
  CmsTelegramSubscription,
  getAllTelegramSubscriptionsForAccounts,
} from '@cowprotocol/cms-api';
import {
  NOTIFICATIONS_QUEUE,
  Notification,
  connectToChannel,
  parseNotifications,
  sleep,
} from '@cowprotocol/notifications';
import { Channel, ConsumeMessage } from 'amqplib';
import assert from 'assert';
import TelegramBot from 'node-telegram-bot-api';

const WAIT_TIME = ms(`10s`);
const SUBSCRIPTION_CACHE_TiME = ms(`5m`);
const MAX_RETRIES = 3; // Maximum number of retry attempts before dropping a message

const SUBSCRIPTION_CACHE = new Map<string, CmsTelegramSubscription[]>();
const LAST_SUBSCRIPTION_CHECK = new Map<string, Date>();
const MESSAGE_RETRIES = new Map<string, number>(); // Track message retries by message ID

let telegramBot: TelegramBot;

// Create telegram bot
function createTelegramBot() {
  if (!telegramBot) {
    const token = process.env.TELEGRAM_SECRET;
    assert(token, 'TELEGRAM_SECRET is required');
    telegramBot = new TelegramBot(token, { polling: true });
  }

  return telegramBot;
}

async function getSubscriptions(
  account: string
): Promise<CmsTelegramSubscription[]> {
  // Get the subscriptions for this account
  const lastCheck = LAST_SUBSCRIPTION_CHECK.get(account);
  if (
    !lastCheck ||
    lastCheck.getTime() + SUBSCRIPTION_CACHE_TiME < Date.now()
  ) {
    // Get the subscriptions for this account (if we haven't checked in a while)
    const subscriptionForAccount = await getAllTelegramSubscriptionsForAccounts(
      [account]
    );
    SUBSCRIPTION_CACHE.set(account, subscriptionForAccount);
  }

  return SUBSCRIPTION_CACHE.get(account) || [];
}

function parseNewMessage(msg: ConsumeMessage): Notification[] | null {
  try {
    const message = msg.content.toString();
    const notifications = parseNotifications(message);

    if (!isNotificationArray(notifications)) {
      throw new Error('The message is not a valid notification array');
    }

    return notifications;
  } catch (error) {
    console.error(`Error parsing notification`, error);
    return null;
  }
}

function isNotificationArray(
  notifications: unknown
): notifications is Notification[] {
  return Array.isArray(notifications) && notifications.every(isNotification);
}

function isNotification(notification: unknown): notification is Notification {
  return (
    typeof notification === 'object' &&
    notification !== null &&
    'id' in notification &&
    'account' in notification &&
    'title' in notification &&
    'message' in notification
  );
}

async function onNewMessage(channel: Channel, msg: ConsumeMessage) {
  let consumeMessage = false;

  try {
    // Parse the message
    const notifications = parseNewMessage(msg);

    if (!notifications) {
      return;
    }

    for (const notification of notifications) {
      const sent = await sendNotification(notification);

      if (!sent && !consumeMessage) {
        // If we didn't send any notification, we just throw. Otherwise we try to send the next notification
        throw new Error(`Failed to send the notifications`);
      }
      consumeMessage ||= sent;
    }
  } finally {
    const messageId = msg.properties.messageId || msg.content.toString();
    const retryCount = MESSAGE_RETRIES.get(messageId) || 0;

    if (consumeMessage) {
      // Successfully processed, acknowledge the message
      MESSAGE_RETRIES.delete(messageId); // Clear retry count
      channel.ack(msg);
    } else if (retryCount >= MAX_RETRIES) {
      // Max retries reached, drop the message
      console.error(
        `[telegram:main] Max retries (${MAX_RETRIES}) reached for message ${messageId}, dropping it`
      );
      MESSAGE_RETRIES.delete(messageId); // Clear retry count
      channel.ack(msg); // Acknowledge to remove from queue
    } else {
      // Increment retry count and NACK the message
      const newRetryCount = retryCount + 1;
      MESSAGE_RETRIES.set(messageId, newRetryCount);
      console.warn(
        `[telegram:main] Retry attempt ${newRetryCount}/${MAX_RETRIES} for message ${messageId}`
      );
      channel.nack(msg, false, false);
    }
  }
}

async function sendNotification(notification: Notification): Promise<boolean> {
  const { id, message, account, title, url } = notification;
  console.debug(
    `[telegram:main] New Notification ${id} for ${account}. ${title}: ${message}. URL=${url}`
  );

  // Get the subscriptions for this account
  const telegramSubscriptions = await getSubscriptions(account).catch(
    (error) => {
      console.error(
        `Error getting subscriptions for account ${account}`,
        error
      );
      return null;
    }
  );

  if (!telegramSubscriptions) {
    return false;
  }

  let consumeMessage = false;
  try {
    if (telegramSubscriptions.length > 0) {
      // Send the message to all subscribers
      for (const { chatId } of telegramSubscriptions) {
        console.debug(
          `[telegram:main] Sending message ${id} to chatId ${chatId}`
        );
        telegramBot.sendMessage(chatId, formatMessage(notification));

        // Acknowledge the message once its been sent to at least one subscriber for this account
        consumeMessage = true;
      }
    } else {
      // No telegram subscriptions found for this account
      consumeMessage = true;
      console.debug(
        `[telegram:main] No subscriptions found for account ${account}`
      );
    }
  } catch (error) {
    if (!consumeMessage) {
      console.error(`Error sending notification`, error);
    }
  }

  // We return whether we notified at least one consumer
  return consumeMessage;
}

async function connect() {
  const { connection, channel } = await connectToChannel({
    channel: NOTIFICATIONS_QUEUE,
  });

  console.info(
    `[telegram:main] Waiting for messages in "${NOTIFICATIONS_QUEUE}" queue`
  );
  await channel.consume(
    NOTIFICATIONS_QUEUE,
    async (msg) => {
      if (msg !== null) {
        onNewMessage(channel, msg).catch((error) =>
          console.error('Error processing queue message', error)
        );
      }
    },
    {
      noAck: false,
    }
  );

  return { connection, channel };
}

/**
 * Connect to RabbitMQ and listen for messages. It will post them to Telegram when they belong to a subscribed account.
 *
 * This function will not resolved until the connection is closed or an error occurs.
 */
async function main() {
  telegramBot = createTelegramBot();
  const { connection } = await connect();

  // Watch for connection close
  let connectionOpen = true;
  connection.on('close', () => {
    console.error(
      `[telegram:main] Queue connection closed! Reconnecting in ${
        WAIT_TIME / 1000
      }s`
    );
    connectionOpen = false;
  });

  // Wait while we have an open connection
  while (connectionOpen) {
    await sleep(WAIT_TIME);
  }
}

function formatMessage({ title, message, url }: Notification) {
  return `\
${title}

${message}

${
  url
    ? `

More info in ${url}`
    : ''
}`;
}

/**
 * Main loop: Run and re-attempt on error
 */
async function mainLoop() {
  console.info('[telegram:main] Start telegram consumer');
  // eslint-disable-next-line no-constant-condition
  while (true) {
    try {
      await main();
    } catch (error) {
      console.error('[telegram:main] Error', error);
      console.info(`[telegram:main] Reconnecting in ${WAIT_TIME / 1000}s...`);
    } finally {
      await sleep(WAIT_TIME);
    }
  }
}

mainLoop();
