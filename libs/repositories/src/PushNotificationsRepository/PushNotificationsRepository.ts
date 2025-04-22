import {
  connectToChannel,
  ConnectToChannelResponse,
  NOTIFICATIONS_QUEUE,
  sendNotificationsToQueue,
  PushNotification,
} from '@cowprotocol/notifications';

/**
 * Notifications repository.
 *
 * This repository allows to send notifications to a queue.
 */
export interface PushNotificationsRepository {
  connect(): Promise<unknown>;
  sendNotifications(notifications: PushNotification[]): Promise<void>;
  pingConnection(): Promise<boolean>;
}

export class PushNotificationsRepositoryRabbit
  implements PushNotificationsRepository
{
  connection: ConnectToChannelResponse | null = null;
  constructor(private readonly queueName = NOTIFICATIONS_QUEUE) {}

  async connect(): Promise<ConnectToChannelResponse> {
    if (!this.connection || !this.pingConnection()) {
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

  async sendNotifications(notifications: PushNotification[]) {
    const connection = await this.connect();

    await sendNotificationsToQueue({
      channel: connection.channel,
      queue: this.queueName,
      notifications,
    });
  }

  /**
   * Ping the connection to check if it's still alive
   * @returns true if the connection is alive, false otherwise
   */
  async pingConnection(): Promise<boolean> {
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
