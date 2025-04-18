import {
  COW_PROTOCOL_SETTLEMENT_CONTRACT_ADDRESS,
  SupportedChainId,
} from '@cowprotocol/cow-sdk';
import { Notification } from '@cowprotocol/notifications';
import { viemClients } from '@cowprotocol/repositories';
import { NotificationsRepository } from '../repositories/NotificationsRepository';
import { doForever } from '../utils';

import { Runnable } from '../../types';
import { SubscriptionRepository } from '../repositories/SubscriptionsRepository';
import { NotificationsIndexerStateRepository } from '../repositories/NotificationsIndexerStateRepository';
import { getAddress, parseAbi } from 'viem';

const EVENTS = parseAbi([
  'event OrderInvalidated(address indexed owner, bytes orderUid)',
  'event Trade(address indexed owner, address sellToken, address buyToken, uint256 sellAmount, uint256 buyAmount, uint256 feeAmount, bytes orderUid)',
]);

const WAIT_TIME = 30000;
const PRODUCER_NAME = 'trade_notification_producer';

// TODO: Get from SDK
const CHAIN_NAME_MAP: Record<SupportedChainId, string> = {
  [SupportedChainId.MAINNET]: 'mainnet',
  [SupportedChainId.ARBITRUM_ONE]: 'arb1',
  [SupportedChainId.GNOSIS_CHAIN]: 'gc',
  [SupportedChainId.BASE]: 'base',
  [SupportedChainId.SEPOLIA]: 'sepolia',
};

export type TradeNotificationProducerProps = {
  chainId: SupportedChainId;
  notificationsRepository: NotificationsRepository;
  subscriptionRepository: SubscriptionRepository;
  notificationsIndexerStateRepository: NotificationsIndexerStateRepository;
};

export class TradeNotificationProducer implements Runnable {
  isStopping = false;
  prefix: string;

  /**
   * This in-memory state just adds some resilience in case there's an error posting the message.
   * Because the PUSH notifications are currently consumed just by reading, in case of a failure the notification is lost
   *
   * This solution is a patch until we properly implement a more reliable consumption
   */
  pendingNotifications = new Map<string, Notification>();

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
    await doForever(
      'TradeNotificationProducer:' + this.props.chainId,
      async (stop) => {
        console.log(
          'TradeNotificationProducer:' + this.props.chainId,
          'isStopping?',
          this.isStopping
        );
        if (this.isStopping) {
          stop();
          return;
        }
        await this.fetchAndSend();
      },
      WAIT_TIME
    );

    console.log(`${this.prefix} stopped`);
  }

  async stop(): Promise<void> {
    console.log(
      `${this.prefix} Stopping TradeNotificationProducer for chainId=${this.props.chainId}`
    );
    this.isStopping = true;
  }

  async fetchAndSend(): Promise<void> {
    const {
      chainId,
      subscriptionRepository,
      notificationsIndexerStateRepository,
    } = this.props;

    // Get last indexed block
    const stateRegistry =
      await notificationsIndexerStateRepository.get<TradeNotificationProducerState>(
        PRODUCER_NAME,
        chainId
      );

    const client = viemClients[chainId];

    // Get last block
    const lastBlock = await client.getBlock();

    // Get trade events from block to last block
    const fromBlock = stateRegistry?.state
      ? BigInt(stateRegistry.state.lastBlock) + 1n
      : lastBlock.number;

    if (fromBlock > lastBlock.number) {
      console.log(`${this.prefix} No new blocks to index`);
      return;
    }

    const accounts = await subscriptionRepository.getAllSubscribedAccounts();
    console.log(`${this.prefix} Accounts: ${accounts.join(', ')}`);

    const logs = await client.getLogs({
      events: EVENTS,
      fromBlock,
      toBlock: lastBlock.number,
      address: getAddress(COW_PROTOCOL_SETTLEMENT_CONTRACT_ADDRESS[chainId]),
      args: {
        owner: accounts,
      } as any,
    });
    console.log(`${this.prefix} Found ${logs.length} events`);

    const notifications = logs.reduce<Notification[]>((acc, log) => {
      if (!log.args.owner) {
        // TODO: Filter for relevant ones (or better, filter in the getLogs already)
        // No owner
        return acc;
      }

      const url = log.args.orderUid
        ? getExplorerUrl(chainId, log.args.orderUid)
        : undefined;

      switch (log.eventName) {
        case 'Trade': {
          const message = `Trade ${log.args.sellAmount} ${log.args.sellToken} for ${log.args.buyAmount} ${log.args.buyToken}`;
          console.log(`${this.prefix} New ${message}`);
          acc.push({
            id: 'Trade-' + log.transactionHash + '-' + log.logIndex,
            account: log.args.owner,
            title: 'Trade',
            message,
            url,
          });
          break;
        }

        case 'OrderInvalidated': {
          const message = 'Order invalidated ' + log.args.orderUid;
          console.log(`${this.prefix} ${message}`);
          acc.push({
            id: 'Trade-' + log.transactionHash + '-' + log.logIndex,
            account: log.args.owner,
            title: 'Trade',
            message,
            url,
          });
          break;
        }
        default:
          console.log(`${this.prefix} Unknown event ${log}`);
          break;
      }
      return acc;
    }, []);

    // TODO:
    // Get trade events from block to last block
    // TODO:
    // Filter events, only keep relevant ones
    // TODO:
    // Convert events to notifications
    // TODO:
    // Send notifications
    // TODO:

    console.log(`${this.prefix} Notifications:`, notifications);

    // Connect
    await this.props.notificationsRepository.connect();

    // Post notifications to queue
    this.props.notificationsRepository.sendNotifications(notifications);
    this.pendingNotifications.clear();

    // Update state
    notificationsIndexerStateRepository.upsert<TradeNotificationProducerState>(
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

interface TradeNotificationProducerState {
  lastBlock: string;
  lastBlockTimestamp: string;
  lastBlockHash: string;
}

function getExplorerUrl(chainId: SupportedChainId, orderUid: string) {
  const baseUrl = getExplorerBaseUrl(chainId);
  return `${baseUrl}/orders/${orderUid}`;
}

function getExplorerBaseUrl(chainId: SupportedChainId) {
  const suffix =
    chainId === SupportedChainId.MAINNET ? '' : `/${CHAIN_NAME_MAP[chainId]}`;
  return `https://explorer.cow.fi${suffix}`;
}
