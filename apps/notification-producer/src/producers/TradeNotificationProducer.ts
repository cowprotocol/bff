import {
  COW_PROTOCOL_SETTLEMENT_CONTRACT_ADDRESS,
  SupportedChainId,
} from '@cowprotocol/cow-sdk';
import { Notification } from '@cowprotocol/notifications';
import { Erc20, Erc20Repository, viemClients } from '@cowprotocol/repositories';
import { NotificationsRepository } from '../repositories/NotificationsRepository';
import { doForever } from '../utils';

import { Runnable } from '../../types';
import { SubscriptionRepository } from '../repositories/SubscriptionsRepository';
import { NotificationsIndexerStateRepository } from '../repositories/NotificationsIndexerStateRepository';
import { formatUnits, getAddress, parseAbi } from 'viem';
import { bigIntReplacer } from '@cowprotocol/shared';

const EVENTS = parseAbi([
  'event OrderInvalidated(address indexed owner, bytes orderUid)',
  'event Trade(address indexed owner, address sellToken, address buyToken, uint256 sellAmount, uint256 buyAmount, uint256 feeAmount, bytes orderUid)',
]);

const WAIT_TIME = 10000;
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
  erc20Repository: Erc20Repository;
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
      erc20Repository,
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
    // console.log(`${this.prefix} Accounts: ${accounts.join(', ')}`);

    const logs = await client.getLogs({
      events: EVENTS,
      fromBlock,
      toBlock: lastBlock.number,
      address: getAddress(COW_PROTOCOL_SETTLEMENT_CONTRACT_ADDRESS[chainId]),
      args: {
        owner: accounts,
      } as any,
    });

    if (logs.length === 0) {
      return;
    }

    console.log(`${this.prefix} Found ${logs.length} events`);

    const notificationPromises = logs.reduce<Promise<Notification>[]>(
      (acc, log) => {
        switch (log.eventName) {
          case 'Trade': {
            const {
              owner,
              orderUid,
              sellToken: sellTokenAddress,
              buyToken: buyTokenAddress,
              sellAmount,
              buyAmount,
              feeAmount,
            } = log.args;
            if (
              owner === undefined ||
              sellTokenAddress === undefined ||
              buyTokenAddress === undefined ||
              orderUid === undefined ||
              sellAmount === undefined ||
              buyAmount === undefined ||
              feeAmount === undefined
            ) {
              console.error(
                `${this.prefix} Invalid Trade event ${JSON.stringify(
                  log,
                  bigIntReplacer,
                  2
                )}`
              );
              break;
            }

            acc.push(
              getTradeNotification({
                prefix: this.prefix,
                id: 'Trade-' + log.transactionHash + '-' + log.logIndex,
                chainId,
                orderUid,
                owner,
                sellTokenAddress,
                buyTokenAddress,
                sellAmount,
                buyAmount,
                feeAmount,
                erc20Repository,
              })
            );
            break;
          }

          case 'OrderInvalidated': {
            const { orderUid, owner } = log.args;
            if (orderUid === undefined || owner === undefined) {
              console.error(
                `${this.prefix} Invalid OrderInvalidated event ${JSON.stringify(
                  log,
                  bigIntReplacer,
                  2
                )}`
              );
              break;
            }

            // console.log(`${this.prefix} ${message}`);
            acc.push(
              getOrderInvalidatedNotification({
                id:
                  'OrderInvalidated-' +
                  log.transactionHash +
                  '-' +
                  log.logIndex,
                chainId,
                orderUid,
                owner,
                prefix: this.prefix,
              })
            );
            break;
          }
          default:
            console.log(`${this.prefix} Unknown event ${log}`);
            break;
        }
        return acc;
      },
      []
    );

    if (notificationPromises.length === 0) {
      return;
    }

    // TODO:
    // Get trade events from block to last block
    // TODO:
    // Filter events, only keep relevant ones
    // TODO:
    // Convert events to notifications
    // TODO:
    // Send notifications
    // TODO:

    // Connect
    await this.props.notificationsRepository.connect();

    // Await to resolve all notifications
    const notifications = await Promise.all(notificationPromises);

    console.log(
      `${this.prefix} Sending ${notifications.length} notifications`,
      JSON.stringify(notifications, null, 2)
    );

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

async function getTradeNotification(props: {
  prefix: string;
  id: string;
  chainId: SupportedChainId;
  orderUid: string;
  owner: string;
  sellTokenAddress: string;
  buyTokenAddress: string;
  sellAmount: bigint;
  buyAmount: bigint;
  feeAmount: bigint;
  erc20Repository: Erc20Repository;
}): Promise<Notification> {
  const {
    id,
    chainId,
    owner,
    sellTokenAddress,
    buyTokenAddress,
    sellAmount,
    buyAmount,
    erc20Repository,
    prefix,
    orderUid,
  } = props;

  const sellToken = await erc20Repository.get(
    chainId,
    getAddress(sellTokenAddress)
  );

  const buyToken = await erc20Repository.get(
    chainId,
    getAddress(buyTokenAddress)
  );

  const sellAmountFormatted = formatAmount(sellAmount, sellToken?.decimals);
  const buyAmountFormatted = formatAmount(buyAmount, buyToken?.decimals);

  const sellTokenName = formatTokenName(sellToken);
  const buyTokenName = formatTokenName(buyToken);

  const message = `Trade ${sellAmountFormatted} ${sellTokenName} for ${buyAmountFormatted} ${buyTokenName}`;
  const url = orderUid ? getExplorerUrl(chainId, orderUid) : undefined;
  console.log(`${prefix} New ${message}`);
  return {
    id,
    account: owner,
    title: 'New Trade',
    message,
    url,
  };
}

async function getOrderInvalidatedNotification(props: {
  id: string;
  chainId: SupportedChainId;
  orderUid: string;
  owner: string;
  prefix: string;
}): Promise<Notification> {
  const { id, chainId, orderUid, owner, prefix } = props;
  const message = 'Order invalidated ' + orderUid;
  const url = getExplorerUrl(chainId, orderUid);
  console.log(`${prefix} ${message}`);

  return {
    id,
    account: owner,
    title: 'Trade',
    message,
    url,
  };
}

function formatAmount(amount: bigint, decimals: number | undefined) {
  return decimals ? formatUnits(amount, decimals) : amount.toString();
}

function formatTokenName(token: Erc20 | null) {
  return token?.symbol ? `${token.symbol}` : token?.address;
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
