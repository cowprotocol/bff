import { Notification } from '@cowprotocol/notifications';
import { NotificationsRepository } from '../NotificationsRepository';
import { doForever } from '../utils';

import { Runnable } from '../../types';
import { SubscriptionRepository } from '../SubscriptionsRepository';

const WAIT_TIME = 30000;

export type TradeNotificationProducerProps = {
  notificationsRepository: NotificationsRepository;
  subscriptionRepository: SubscriptionRepository;
};

export class TradeNotificationProducer implements Runnable {
  /**
   * This in-memory state just adds some resilience in case there's an error posting the message.
   * Because the PUSH notifications are currently consumed just by reading, in case of a failure the notification is lost
   *
   * This solution is a patch until we properly implement a more reliable consumption
   */
  pendingNotifications = new Map<string, Notification>();

  constructor(private props: TradeNotificationProducerProps) {}

  /**
   * Main loop: Run the CMS notification producer. This method runs indefinitely,
   * fetching notifications and sending them to the queue.
   *
   * The method should not throw or finish.
   */
  async start(): Promise<void> {
    doForever(
      'TradeNotificationProducer',
      async () => {
        await this.fetchAndSend();
      },
      WAIT_TIME
    );
  }

  async fetchAndSend(): Promise<void> {
    // Get last indexed block
    // TODO:
    // Get last block
    // TODO:
    // Get trade events from block to last block
    // TODO:
    // Filter events, only keep relevant ones
    // TODO:
    // Convert events to notifications
    // TODO:
    // Send notifications
    // TODO:

    const accounts =
      await this.props.subscriptionRepository.getAllSubscribedAccounts();

    console.log(
      'For now, nothing to do. I plan to fetch trades for: ' +
        accounts.join(', ')
    );
  }
}
