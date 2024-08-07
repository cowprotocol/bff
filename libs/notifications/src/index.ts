import amqp, { Channel, Connection } from 'amqplib';
import assert from 'assert';

export const NOTIFICATIONS_QUEUE = 'notifications';

// Connect to RabbitMQ server
const queueHost = process.env.QUEUE_HOST;
assert(queueHost, 'QUEUE_HOST is required');
const queuePort = +(process.env.QUEUE_PORT || '5672');
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
export function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export interface ConnectToQueueParams {
  channel?: string;
}

export interface ConnectToChannelResponse {
  connection: Connection;
  channel: Channel;
}

export async function connectToChannel(
  params: ConnectToQueueParams
): Promise<ConnectToChannelResponse> {
  // Connect to RabbitMQ server
  const { channel: channelName } = params;

  const connection = await amqp.connect({
    hostname: queueHost,
    port: queuePort,
    username: queueUser,
    password: queuePassword,
  });

  const channel = await connection.createChannel();

  if (channelName) {
    // This makes sure the queue is declared
    channel.assertQueue(channelName, {
      durable: false,
    });
  }

  return { connection, channel };
}

export interface SendToQueueParams {
  channel: Channel;
  queue: string;
  notification: Notification;
}

export function sendNotificationToQueue(params: SendToQueueParams) {
  const { channel, queue, notification } = params;
  const message = stringifyNotification(notification);
  channel.sendToQueue(queue, Buffer.from(message));
}
