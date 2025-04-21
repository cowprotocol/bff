import { SupportedChainId } from '@cowprotocol/cow-sdk';
import {
  Erc20Repository,
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

export interface TradeNotificationProducerState {
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

    logger.info(`${this.prefix} stopped`);
  }

  async stop(): Promise<void> {
    logger.info(
      `${this.prefix} Stopping TradeNotificationProducer for chainId=${this.props.chainId}`
    );
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

    // Get trade events from block to last block
    const fromBlock = stateRegistry?.state
      ? BigInt(stateRegistry.state.lastBlock) + 1n
      : lastBlock.number;

    if (fromBlock > lastBlock.number) {
      logger.info(`${this.prefix} No new blocks to index`);
      return;
    }

    // Get all accounts subscribed to PUSH notifications
    const accounts =
      await pushSubscriptionsRepository.getAllSubscribedAccounts();

    // Get all trade notifications for the block range
    const toBlock = lastBlock.number;
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

    logger.info(
      `${this.prefix} Sending ${notifications.length} notifications`,
      JSON.stringify(notifications, null, 2)
    );

    // Post notifications to queue
    this.props.pushNotificationsRepository.sendNotifications(notifications);

    // Update state
    indexerStateRepository.upsert<TradeNotificationProducerState>(
      PRODUCER_NAME,
      {
        lastBlock: lastBlock.number.toString(),
        lastBlockTimestamp: lastBlock.timestamp.toString(),
        lastBlockHash: lastBlock.hash,
      },
      chainId
    );
  }
}
