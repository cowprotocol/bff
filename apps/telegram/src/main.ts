import 'reflect-metadata';

import ms from 'ms';

import {
  CmsTelegramSubscription,
  getAllTelegramSubscriptionsForAccounts,
} from '@cowprotocol/cms-api';
import { doForever, logger, sleep } from '@cowprotocol/shared';
import {
  getPushNotificationsRepository,
  getTelegramBot,
} from '@cowprotocol/services';
import { PushNotification } from '@cowprotocol/notifications';
import TelegramBot from 'node-telegram-bot-api';

const WAIT_TIME = ms(`10s`);
const SUBSCRIPTION_CACHE_TIME = ms(`5m`);

const SUBSCRIPTION_CACHE = new Map<string, CmsTelegramSubscription[]>();
const LAST_SUBSCRIPTION_CHECK = new Map<string, Date>();

let telegramBot: TelegramBot;

/**
 * Main loop: Run and re-attempt on error
 */
async function mainLoop() {
  // Create telegram bot
  telegramBot = getTelegramBot();

  // Subscribe to notifications
  logger.info('[telegram] Start telegram consumer');
  await doForever({
    name: 'telegram',
    callback: subscribeToNotifications,
    waitTimeMilliseconds: WAIT_TIME,
    logger,
  });
}

async function getSubscriptions(
  account: string
): Promise<CmsTelegramSubscription[]> {
  // Get the subscriptions for this account
  const lastCheck = LAST_SUBSCRIPTION_CHECK.get(account);
  if (
    !lastCheck ||
    lastCheck.getTime() + SUBSCRIPTION_CACHE_TIME < Date.now()
  ) {
    // Get the subscriptions for this account (if we haven't checked in a while)
    const subscriptionForAccount = await getAllTelegramSubscriptionsForAccounts(
      [account]
    );
    SUBSCRIPTION_CACHE.set(account, subscriptionForAccount);
  }

  return SUBSCRIPTION_CACHE.get(account) || [];
}

async function sendNotificationToTelegram(
  notification: PushNotification
): Promise<boolean> {
  const { id, message, account, title, url } = notification;
  logger.debug(
    `[telegram] New PushNotification ${id} for ${account}. ${title}: ${message}. URL=${url}`
  );

  // Get the subscriptions for this account
  const telegramSubscriptions = await getSubscriptions(account).catch(
    (error) => {
      logger.error(error, `Error getting subscriptions for account ${account}`);
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
        logger.info(
          `[telegram] Sending message ${id} to chatId ${chatId}. Title: ${title}. Message: ${message}. URL=${url}`
        );
        telegramBot.sendMessage(chatId, formatMessage(notification));

        // Acknowledge the message once its been sent to at least one subscriber for this account
        consumeMessage = true;
      }
    } else {
      // No telegram subscriptions found for this account
      consumeMessage = true;
      logger.debug(`[telegram] No subscriptions found for account ${account}`);
    }
  } catch (error) {
    if (!consumeMessage) {
      logger.error(error, `Error sending notification`);
    }
  }

  // We return whether we notified at least one consumer
  return consumeMessage;
}

/**
 * Subscribe to new notifications. It will post them to Telegram when they belong to a subscribed account.
 *
 * This function will not resolved until the connection is closed or an error occurs.
 */
async function subscribeToNotifications() {
  const pushNotificationsRepository = getPushNotificationsRepository();

  // Connect to push notifications
  const { connection } = await pushNotificationsRepository.connect();

  // Subscribe to new notifications
  const { subscriptionId, cancelSubscription } =
    await pushNotificationsRepository.subscribe(sendNotificationToTelegram);

  logger.info(
    `[telegram] Subscribed to notifications with ID ${subscriptionId}`
  );

  // Watch for connection close
  let connectionOpen = true;
  connection.on('close', () => {
    logger.error(
      `[telegram] Queue connection closed! Reconnecting in ${WAIT_TIME / 1000}s`
    );
    connectionOpen = false;

    // Cancel the subscription
    cancelSubscription();
  });

  // Wait while we have an open connection
  while (connectionOpen) {
    await sleep(WAIT_TIME);
  }
}

function formatMessage({ title, message, url }: PushNotification) {
  const moreInfo = url ? `\n\nMore info in ${url}` : '';

  return `\
${title}

${message}${moreInfo}`;
}

mainLoop().catch((error) => logger.error(error, 'Unhandled error in telegram'));
