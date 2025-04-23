import { SupportedChainId } from '@cowprotocol/cow-sdk';
import {
  Erc20Repository,
  IndexerStateValue,
  PushNotificationsRepository,
  viemClients,
} from '@cowprotocol/repositories';

import { Runnable } from '../../../types';
import { PushSubscriptionsRepository } from '@cowprotocol/repositories';
import { IndexerStateRepository } from '@cowprotocol/repositories';
import { doForever, logger } from '@cowprotocol/shared';
import { getTradeNotifications } from './getTradeNotifications';

const WAIT_TIME = 10000;
const PRODUCER_NAME = 'trade_notification_producer';

export type TradeNotificationProducerProps = {
  chainId: SupportedChainId;
  pushNotificationsRepository: PushNotificationsRepository;
  pushSubscriptionsRepository: PushSubscriptionsRepository;
  indexerStateRepository: IndexerStateRepository;
  erc20Repository: Erc20Repository;
};

export interface TradeNotificationProducerState extends IndexerStateValue {
  lastBlock: string;
  lastBlockTimestamp: string;
  lastBlockHash: string;
}

export class TradeNotificationProducer implements Runnable {
  isStopping = false;
  prefix: string;

  constructor(private props: TradeNotificationProducerProps) {
    this.prefix = '[TradeNotificationProducer:' + this.props.chainId + ']';
  }

  /**
   * Main loop: Run the CMS notification producer. This method runs indefinitely,
   * fetching notifications and sending them to the queue.
   *
   * The method should not throw or finish.
   */
  async start(): Promise<void> {
    await doForever({
      name: 'TradeNotificationProducer:' + this.props.chainId,
      callback: async (stop) => {
        if (this.isStopping) {
          stop();
          return;
        }
        await this.fetchAndSend();
      },
      waitTimeMilliseconds: WAIT_TIME,
      logger,
    });
  }

  async stop(): Promise<void> {
    this.isStopping = true;
  }

  async fetchAndSend(): Promise<void> {
    const {
      chainId,
      pushSubscriptionsRepository,
      indexerStateRepository,
      erc20Repository,
    } = this.props;

    // Get last indexed block
    const stateRegistry =
      await indexerStateRepository.get<TradeNotificationProducerState>(
        PRODUCER_NAME,
        chainId
      );

    // Get last block
    const client = viemClients[chainId];
    const lastBlock = await client.getBlock();
    const toBlock = lastBlock.number;

    // Get trade events from block to last block
    const fromBlock = stateRegistry?.state
      ? BigInt(stateRegistry.state.lastBlock) + 1n
      : toBlock;

    const numberOfBlocksToIndex = toBlock - fromBlock + 1n;

    // Print debug message
    if (numberOfBlocksToIndex < 1n) {
      // We are up to date. Nothing to index
      logger.trace(`${this.prefix} No new blocks to index`);
      return;
    } else {
      logger.debug(
        `${this.prefix} Indexing from block ${fromBlock} to ${toBlock}: ${numberOfBlocksToIndex} blocks`
      );
    }

    // Get all accounts subscribed to PUSH notifications
    const accounts =
      await pushSubscriptionsRepository.getAllSubscribedAccounts();

    // Get all trade notifications for the block range
    const notificationPromises = getTradeNotifications({
      accounts,
      fromBlock,
      toBlock,
      chainId,
      erc20Repository,
      prefix: this.prefix,
    });

    // Connect to PUSH repository
    await this.props.pushNotificationsRepository.connect();

    // Await to resolve all notifications
    const notifications = await notificationPromises;

    // Return early if there are no notifications
    if (notifications.length > 0) {
      logger.info(
        `${this.prefix} Sending ${notifications.length} notifications`,
        JSON.stringify(notifications, null, 2)
      );
    }

    // Post notifications to queue
    this.props.pushNotificationsRepository.send(notifications);

    // Update state
    indexerStateRepository.upsert<TradeNotificationProducerState>(
      PRODUCER_NAME,
      {
        lastBlock: toBlock.toString(),
        lastBlockTimestamp: lastBlock.timestamp.toString(),
        lastBlockHash: lastBlock.hash,
      },
      chainId
    );
  }
}
