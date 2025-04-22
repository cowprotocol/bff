import {
  ConnectToChannelResponse,
  ConnectToQueueParams,
  parseNotifications,
  PushNotification,
  stringifyNotifications,
} from '@cowprotocol/notifications';
import { createRabbitMqConnection } from '../datasources/rabbitMq';
import { logger } from '@cowprotocol/shared';
import crypto from 'node:crypto';

const MAX_RETRIES = 3; // Maximum number of retry attempts before dropping a message
export const NOTIFICATIONS_QUEUE = 'notifications';

export interface QueueSubscription {
  subscriptionId: string;
  cancelSubscription: () => void;
}

/**
 * Notifications repository.
 *
 * This repository allows to send notifications to a queue.
 */
export interface PushNotificationsRepository {
  connection: ConnectToChannelResponse | null;

  connect(): Promise<ConnectToChannelResponse>;
  close(): Promise<void>;

  send(notifications: PushNotification[]): Promise<void>;
  subscribe(
    callback: (notification: PushNotification) => Promise<boolean>
  ): Promise<QueueSubscription>;
  ping(): Promise<boolean>;
}

export class PushNotificationsRepositoryRabbit
  implements PushNotificationsRepository
{
  connection: ConnectToChannelResponse | null = null;

  messageRetries = new Map<string, number>(); // Track message retries by message ID

  constructor(
    private readonly queueName = NOTIFICATIONS_QUEUE,
    private readonly maxRetries = MAX_RETRIES
  ) {}

  async connect(): Promise<ConnectToChannelResponse> {
    if (!this.connection || !(await this.ping())) {
      // Connect to the queue
      this.connection = await connectToChannel({
        channel: this.queueName,
      });

      // Watch for connection close
      this.connection.connection.on('close', () => this.close());

      return this.connection;
    }

    // Return connection
    return this.connection;
  }

  async close() {
    if (this.connection) {
      try {
        await this.connection.connection.close();
      } finally {
        this.connection = null;
      }
    }
  }

  async send(notifications: PushNotification[]) {
    const connection = await this.connect();
    const { channel } = connection;

    // If there are no notifications, do nothing
    if (notifications.length === 0) {
      return;
    }

    const message = stringifyNotifications(notifications);
    channel.sendToQueue(this.queueName, Buffer.from(message), {
      messageId: crypto.randomUUID(),
    });
  }

  async subscribe(
    callback: (notification: PushNotification) => Promise<boolean>
  ): Promise<QueueSubscription> {
    logger.info(
      `[PushNotificationsRepository] Waiting for messages in "${this.queueName}" queue`
    );

    const { channel } = await this.connect();

    const consumer = await channel.consume(
      this.queueName,
      async (msg) => {
        if (msg !== null) {
          const messageId = msg.properties.messageId || msg.content.toString();

          let consumeMessage = false;
          const clearRetryCount = () => this.messageRetries.delete(messageId);
          logger.debug(
            `[PushNotificationsRepository] Received message ${messageId}`
          );

          try {
            // Parse the message into a notifications array (or throw if invalid)
            const notifications = parseNotifications(msg.content.toString());

            for (const notification of notifications) {
              const sent = await callback(notification);

              if (!sent && !consumeMessage) {
                // If we didn't send any notification, we just throw. Otherwise we try to send the next notification
                throw new Error(`Failed to send the notifications`);
              }
              consumeMessage ||= sent;
            }

            // All notifications handled. Acknowledge & clear the retry counter
            clearRetryCount();
            channel.ack(msg);
          } catch (error) {
            const retryCount = this.messageRetries.get(messageId) || 0;

            if (consumeMessage) {
              // If we sent at least one notification, clear retry count and acknowledge the message
              clearRetryCount();
              channel.ack(msg); // Acknowledge to remove from queue
            } else if (retryCount >= this.maxRetries) {
              // Max retries reached, drop the message
              logger.error(
                error,
                `[PushNotificationsRepository] Max retries (${this.maxRetries}) reached for message ${messageId}, dropping it`
              );
              clearRetryCount();
              channel.nack(msg, false, false); // Negative acknowledge and remove from queue
            } else {
              // Increment retry count and NACK the message
              const newRetryCount = retryCount + 1;
              this.messageRetries.set(messageId, newRetryCount);
              logger.error(
                error,
                `[PushNotificationsRepository] Error processing message. Retrying later`
              );
              logger.warn(
                `[PushNotificationsRepository] Retry attempt ${newRetryCount}/${this.maxRetries} for message ${messageId}`
              );
              channel.nack(msg, false, true); // Negative acknowledge but keep in queue
            }
          }
        }
      },
      {
        noAck: false,
      }
    );

    // Return a subscription ID and a function to cancel the subscription
    return {
      subscriptionId: consumer.consumerTag,
      cancelSubscription: () => {
        channel.cancel(consumer.consumerTag);
      },
    };
  }

  /**
   * Ping the connection to check if it's still alive
   * @returns true if the connection is alive, false otherwise
   */
  async ping(): Promise<boolean> {
    if (!this.connection) return false;

    try {
      const ch = await this.connection.connection.createChannel();
      await ch.close();
      return true;
    } catch (error) {
      return false;
    }
  }
}

async function connectToChannel(
  params: ConnectToQueueParams
): Promise<ConnectToChannelResponse> {
  // Connect to RabbitMQ server
  const { channel: channelName } = params;

  const connection = await createRabbitMqConnection();

  const channel = await connection.createChannel();

  if (channelName) {
    // This makes sure the queue is declared
    channel.assertQueue(channelName, {
      durable: false,
    });
  }

  return { connection, channel };
}
