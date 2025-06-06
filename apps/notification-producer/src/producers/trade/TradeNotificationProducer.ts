import { SupportedChainId } from '@cowprotocol/cow-sdk';
import {
  Erc20Repository,
  getViemClients,
  IndexerStateValue,
  PushNotificationsRepository,
} from '@cowprotocol/repositories';

import { Runnable } from '../../../types';
import { PushSubscriptionsRepository } from '@cowprotocol/repositories';
import { IndexerStateRepository } from '@cowprotocol/repositories';
import { doForever, logger } from '@cowprotocol/shared';
import { getTradeNotifications } from './getTradeNotifications';

const WAIT_TIME = 10000;
const PRODUCER_NAME = 'trade_notification_producer';
const MAX_BLOCKS_PER_BATCH = 5000n;

const NO_PENDING_BLOCKS = { hasPendingBlocks: false };
const HAS_PENDING_BLOCKS = { hasPendingBlocks: true };

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
    let hasPendingBlocks = true;

    // Keep processing blocks until there are no more pending blocks
    while (hasPendingBlocks) {
      ({ hasPendingBlocks } = await this.processAllPendingBlocks());
    }
  }

  async processAllPendingBlocks(): Promise<{ hasPendingBlocks: boolean }> {
    const { chainId, indexerStateRepository } = this.props;

    // Get last indexed block
    const stateRegistry =
      await indexerStateRepository.get<TradeNotificationProducerState>(
        PRODUCER_NAME,
        chainId
      );

    // Get last block
    const client = getViemClients()[chainId];
    const lastBlock = await client.getBlock();
    const toBlockFinal = lastBlock.number;

    // Get starting block
    let fromBlock = stateRegistry?.state
      ? BigInt(stateRegistry.state.lastBlock) + 1n
      : toBlockFinal;

    const totalBlocksToIndex = toBlockFinal - fromBlock + 1n;

    // Print debug message
    if (totalBlocksToIndex < 1n) {
      // We are up to date. Nothing to index
      logger.trace(`${this.prefix} No new blocks to index`);
      return NO_PENDING_BLOCKS;
    } else {
      logger.debug(
        `${this.prefix} Indexing from block ${fromBlock} to ${toBlockFinal}: ${totalBlocksToIndex} blocks`
      );
    }

    // Process blocks in batches
    let page = 1;
    const totalPages = Math.ceil(
      Number(totalBlocksToIndex) / Number(MAX_BLOCKS_PER_BATCH)
    );
    while (fromBlock <= toBlockFinal) {
      // Calculate toBlock for this batch
      const toBlock =
        fromBlock + MAX_BLOCKS_PER_BATCH - 1n > toBlockFinal
          ? toBlockFinal
          : fromBlock + MAX_BLOCKS_PER_BATCH - 1n;

      // Process this batch of blocks

      // Print debug message only if there's more than one page (otherwise is too spammy)
      if (totalPages !== 1) {
        logger.debug(
          `${
            this.prefix
          } Processing batch ${page} of ${totalPages}: From block ${fromBlock} to ${toBlock}: ${
            toBlock - fromBlock + 1n
          } blocks`
        );
      }

      const toBlockInfo = await client.getBlock({ blockNumber: toBlock });
      const producerState: TradeNotificationProducerState = {
        lastBlock: toBlock.toString(),
        lastBlockTimestamp: toBlockInfo.timestamp.toString(),
        lastBlockHash: toBlockInfo.hash,
      };
      await this.processBlocks(fromBlock, toBlock, producerState);

      // Move to next batch
      fromBlock = toBlock + 1n;
      page++;
    }

    // Check if during the process time there were some new blocks
    const newLastBlock = await client.getBlock();
    if (newLastBlock.number > toBlockFinal) {
      logger.debug(
        `${this.prefix} New blocks were indexed during the process: ${
          newLastBlock.number - toBlockFinal
        } blocks`
      );

      // Recursive call to process the new blocks
      return HAS_PENDING_BLOCKS;
    } else {
      return NO_PENDING_BLOCKS;
    }
  }

  async processBlocks(
    fromBlock: bigint,
    toBlock: bigint,
    producerState: TradeNotificationProducerState
  ): Promise<void> {
    const {
      chainId,
      pushSubscriptionsRepository,
      indexerStateRepository,
      erc20Repository,
    } = this.props;

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
    await indexerStateRepository.upsert<TradeNotificationProducerState>(
      PRODUCER_NAME,
      producerState,
      chainId
    );
  }
}
