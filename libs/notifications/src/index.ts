import amqp from 'amqplib';
import assert from 'assert';

export const NOTIFICATIONS_QUEUE = 'notifications';

// Connect to RabbitMQ server
const queueHost = process.env.QUEUE_HOST;
assert(queueHost, 'QUEUE_HOST is required');
const queuePort = +process.env.QUEUE_PORT || 5672;
const queueUser = process.env.QUEUE_USER;
assert(queueUser, 'QUEUE_USER is required');
const queuePassword = process.env.QUEUE_PASSWORD;
assert(queuePassword, 'QUEUE_PASSWORD is required');

export interface Notification {
  id: string;
  account: string;
  title: string;
  message: string;
  url?: string;
}

export function parseNotification(notificationString: string): Notification {
  return JSON.parse(notificationString);
}

export function stringifyNotification(notification: Notification): string {
  return JSON.stringify(notification);
}

// TODO: Move to commons lib
export function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

interface ConnectToQueueParams {
  channel: string;
}

export async function connectToQueue(params: ConnectToQueueParams) {
  // Connect to RabbitMQ server
  const { channel: channelName } = params;
  console.log('[notifications] Fetching notifications');

  const connection = await amqp.connect({
    hostname: queueHost,
    port: queuePort,
    username: queueUser,
    password: queuePassword,
  });

  const channel = await connection.createChannel();

  // This makes sure the queue is declared
  channel.assertQueue(channelName, {
    durable: false,
  });

  return channel;
}
