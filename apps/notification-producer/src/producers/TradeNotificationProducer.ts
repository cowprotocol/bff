import { SupportedChainId } from '@cowprotocol/cow-sdk';
import { Notification } from '@cowprotocol/notifications';
import { viemClients } from '@cowprotocol/repositories';
import { NotificationsRepository } from '../repositories/NotificationsRepository';
import { doForever } from '../utils';

import { Runnable } from '../../types';
import { SubscriptionRepository } from '../repositories/SubscriptionsRepository';
import { NotificationsIndexerStateRepository } from '../repositories/NotificationsIndexerStateRepository';

const WAIT_TIME = 30000;
const PRODUCER_NAME = 'trade_notification_producer';

export type TradeNotificationProducerProps = {
  chainId: SupportedChainId;
  notificationsRepository: NotificationsRepository;
  subscriptionRepository: SubscriptionRepository;
  notificationsIndexerStateRepository: NotificationsIndexerStateRepository;
};

export class TradeNotificationProducer implements Runnable {
  isStopping = false;

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
      async (stop) => {
        if (this.isStopping) {
          stop();
          return;
        }
        await this.fetchAndSend();
      },
      WAIT_TIME
    );
  }

  async stop(): Promise<void> {
    console.log('Stopping CmsNotificationProducer');
    this.isStopping = true;
  }

  async fetchAndSend(): Promise<void> {
    const {
      chainId,
      subscriptionRepository,
      notificationsIndexerStateRepository,
    } = this.props;

    // Get last indexed block
    const stateRegistry = await notificationsIndexerStateRepository.get(
      PRODUCER_NAME,
      chainId
    );

    console.log('stateRegistry', stateRegistry);

    // Get last block
    const lastBlock = await viemClients[chainId].getBlock();

    // TODO:
    // Get trade events from block to last block
    // TODO:
    // Filter events, only keep relevant ones
    // TODO:
    // Convert events to notifications
    // TODO:
    // Send notifications
    // TODO:

    const accounts = await subscriptionRepository.getAllSubscribedAccounts();

    console.log(
      'For now, nothing to do. I plan to fetch trades for: ' +
        accounts.join(', ')
    );

    // Update state
    notificationsIndexerStateRepository.upsert(
      PRODUCER_NAME,
      {
        lastBlock: lastBlock.number,
        lastBlockTimestamp: lastBlock.timestamp,
        lastBlockHash: lastBlock.hash,
      },
      chainId
    );
  }
}
