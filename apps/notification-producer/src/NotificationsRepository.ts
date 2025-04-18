import {
  connectToChannel,
  ConnectToChannelResponse,
  NOTIFICATIONS_QUEUE,
  sendNotificationsToQueue,
  Notification,
} from '@cowprotocol/notifications';

// TODO: Move to repositories
export class NotificationsRepository {
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

  async sendNotifications(notifications: Notification[]) {
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
