import { BARN_ETH_FLOW_ADDRESSES, ETH_FLOW_ADDRESSES, SupportedChainId } from '@cowprotocol/cow-sdk';
import {
  Erc20Repository,
  ExpiredOrdersRepository,
  IndexerStateRepository,
  IndexerStateValue,
  OnChainPlacedOrdersRepository,
  PushNotificationsRepository,
  PushSubscriptionsRepository
} from '@cowprotocol/repositories';

import { Runnable } from '../../../types';
import { doForever, logger } from '@cowprotocol/shared';
import { getExpiredOrderNotification } from './getExpiredOrderNotification';
import { isTruthy } from '../../utils/commonUtils';

async function wait(time: number) {
  return new Promise((res) => setTimeout(res, time))
}

const WAIT_TIME = 10_000;
const POLLING_INTERVAL = 14_000;
const PRODUCER_NAME = 'expired_orders_notification_producer';

export type ExpiredOrdersNotificationProducerProps = {
  chainId: SupportedChainId;
  erc20Repository: Erc20Repository;
  indexerStateRepository: IndexerStateRepository;
  pushSubscriptionsRepository: PushSubscriptionsRepository;
  expiredOrdersRepository: ExpiredOrdersRepository;
  pushNotificationsRepository: PushNotificationsRepository;
  onChainPlacedOrdersRepository: OnChainPlacedOrdersRepository;
};

export interface ExpiredOrdersNotificationProducerState extends IndexerStateValue {
  lastCheckTimestamp: string;
}

export class ExpiredOrdersNotificationProducer implements Runnable {
  isStopping = false;
  prefix: string;

  constructor(private props: ExpiredOrdersNotificationProducerProps) {
    this.prefix = '[ExpiredOrdersNotificationProducer:' + this.props.chainId + ']';
  }

  /**
   * Main loop: Run the CMS notification producer. This method runs indefinitely,
   * fetching notifications and sending them to the queue.
   *
   * The method should not throw or finish.
   */
  async start(): Promise<void> {
    await doForever({
      name: 'ExpiredOrdersNotificationProducer:' + this.props.chainId,
      callback: async (stop) => {
        if (this.isStopping) {
          stop();
          return;
        }
        await this.processExpiredOrders();
      },
      waitTimeMilliseconds: WAIT_TIME,
      logger
    });
  }

  async stop(): Promise<void> {
    this.isStopping = true;
  }

  async processExpiredOrders(): Promise<void> {
    return this.pollExpiredOrders().then(() => {
      return wait(POLLING_INTERVAL);
    }).then(() => {
      if (this.isStopping) return

      return this.processExpiredOrders();
    });
  }

  async pollExpiredOrders() {
    const {
      chainId,
      erc20Repository,
      indexerStateRepository,
      pushSubscriptionsRepository,
      expiredOrdersRepository,
      pushNotificationsRepository,
      onChainPlacedOrdersRepository
    } = this.props;

    const nowTimestamp = Math.ceil(Date.now() / 1000);

    const stateRegistry =
      await indexerStateRepository.get<ExpiredOrdersNotificationProducerState>(
        PRODUCER_NAME,
        chainId
      );

    const lastCheckTimestampRaw = stateRegistry?.state.lastCheckTimestamp;

    if (lastCheckTimestampRaw) {
      const lastCheckTimestamp = Number(lastCheckTimestampRaw);

      const ethFlowAddresses = [ETH_FLOW_ADDRESSES[chainId], BARN_ETH_FLOW_ADDRESSES[chainId]].map(t => t.toLowerCase());

      const accounts =
        await pushSubscriptionsRepository.getAllSubscribedAccounts();

      const expiredOrders = await expiredOrdersRepository.fetchExpiredOrdersForAccounts({
        chainId,
        accounts: [...accounts, ...ethFlowAddresses],
        lastCheckTimestamp,
        nowTimestamp
      });

      const ethFlowOrderOwners = expiredOrders.length
        ? await onChainPlacedOrdersRepository.getAccountsForOrders(chainId, expiredOrders.map(o => o.uid))
        : {};

      logger.debug(
        `${this.prefix} got ${expiredOrders.length} expired orders of ${accounts.length} accounts, lastCheckTimestamp=${lastCheckTimestamp}`
      );

      const notifications = await Promise.all(expiredOrders.map(order => {
        const isEthFlowOrder = ethFlowAddresses.includes(order.owner.toLowerCase());

        const orderOwner = isEthFlowOrder
          ? Object.keys(ethFlowOrderOwners).find(key => {
            const orderUids = ethFlowOrderOwners[key];

            return orderUids.includes(order.uid.toLowerCase());
          })
          : order.owner.toLowerCase();

        if (!orderOwner) return Promise.resolve(undefined);

        return getExpiredOrderNotification(order, {
          chainId,
          nowTimestamp,
          lastCheckTimestamp,
          isEthFlowOrder,
          owner: orderOwner,
          erc20Repository
        });
      }));

      // Return early if there are no notifications
      if (notifications.length > 0) {
        logger.info(
          `${this.prefix} Sending ${notifications.length} notifications`,
          JSON.stringify(notifications, null, 2)
        );

        // Post notifications to queue
        pushNotificationsRepository.send(notifications.filter(isTruthy));
      }
    }

    await indexerStateRepository.upsert<ExpiredOrdersNotificationProducerState>(
      PRODUCER_NAME,
      { lastCheckTimestamp: nowTimestamp.toString() },
      chainId
    );
  }
}
