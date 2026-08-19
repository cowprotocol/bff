import {
  areAddressesEqual,
  BARN_ETH_FLOW_ADDRESSES,
  CowEnv,
  ETH_FLOW_ADDRESSES,
  getAddressKey,
  SupportedChainId,
} from '@cowprotocol/cow-sdk'
import {
  Erc20Repository,
  ExpiredOrdersRepository,
  IndexerStateRepository,
  IndexerStateValue,
  OnChainPlacedOrdersRepository,
  PushNotificationsRepository,
  PushSubscriptionsRepository,
} from '@cowprotocol/repositories'

import { Runnable } from '../../../types'
import { doForever, logger } from '@cowprotocol/shared'
import { getExpiredOrderNotification } from './getExpiredOrderNotification'
import { isTruthy } from '../../utils/commonUtils'

async function wait(time: number) {
  return new Promise((res) => setTimeout(res, time))
}

const WAIT_TIME = 10_000
const POLLING_INTERVAL = 120_000 // 2 minutes
const PRODUCER_NAME = 'expired_orders_notification_producer'

export type ExpiredOrdersNotificationProducerProps = {
  chainId: SupportedChainId
  erc20Repository: Erc20Repository
  indexerStateRepository: IndexerStateRepository
  pushSubscriptionsRepository: PushSubscriptionsRepository
  expiredOrdersRepository: ExpiredOrdersRepository
  pushNotificationsRepository: PushNotificationsRepository
  onChainPlacedOrdersRepository: OnChainPlacedOrdersRepository
}

export interface ExpiredOrdersNotificationProducerState extends IndexerStateValue {
  lastCheckTimestamp: string
}

export class ExpiredOrdersNotificationProducer implements Runnable {
  isStopping = false
  prefix: string

  constructor(private props: ExpiredOrdersNotificationProducerProps) {
    this.prefix = '[ExpiredOrdersNotificationProducer:' + this.props.chainId + ']'
  }

  /**
   * Main loop: Run the Expired orders notification producer. This method runs indefinitely,
   * fetching notifications and sending them to the queue.
   *
   * The method should not throw or finish.
   */
  async start(): Promise<void> {
    await doForever({
      name: 'ExpiredOrdersNotificationProducer:' + this.props.chainId,
      callback: async (stop) => {
        if (this.isStopping) {
          stop()
          return
        }
        await this.processExpiredOrders()
      },
      waitTimeMilliseconds: WAIT_TIME,
      logger,
    })
  }

  async stop(): Promise<void> {
    this.isStopping = true
  }

  async processExpiredOrders(): Promise<void> {
    return this.pollExpiredOrders()
      .then(() => {
        return wait(POLLING_INTERVAL)
      })
      .then(() => {
        if (this.isStopping) return

        return this.processExpiredOrders()
      })
  }

  async pollExpiredOrders() {
    const {
      chainId,
      erc20Repository,
      indexerStateRepository,
      pushSubscriptionsRepository,
      expiredOrdersRepository,
      pushNotificationsRepository,
      onChainPlacedOrdersRepository,
    } = this.props

    const nowTimestamp = Math.ceil(Date.now() / 1000)

    const stateRegistry = await indexerStateRepository.get<ExpiredOrdersNotificationProducerState>(
      PRODUCER_NAME,
      chainId
    )

    const lastCheckTimestampRaw = stateRegistry?.state.lastCheckTimestamp

    if (lastCheckTimestampRaw) {
      const lastCheckTimestamp = Number(lastCheckTimestampRaw)

      const env: CowEnv = process.env.COW_PROTOCOL_ENV === 'staging' ? 'staging' : 'prod'
      const ethFlowAddress = getAddressKey(
        env === 'staging' ? BARN_ETH_FLOW_ADDRESSES[chainId] : ETH_FLOW_ADDRESSES[chainId]
      )
      const accounts = await pushSubscriptionsRepository.getAllSubscribedAccounts()

      logger.debug(
        `${this.prefix} env=${env}, ethFlowAddress=${ethFlowAddress}, checking window (${lastCheckTimestamp}, ${nowTimestamp}], watching ${
          accounts.length
        } subscribed account(s): ${JSON.stringify(accounts)}`
      )

      const expiredOrders = await expiredOrdersRepository.fetchExpiredOrdersForAccounts({
        chainId,
        accounts: [...accounts, ethFlowAddress],
        lastCheckTimestamp,
        nowTimestamp,
      })

      logger.debug(
        `${this.prefix} got ${expiredOrders.length} expired order(s): ${JSON.stringify(
          expiredOrders.map((o) => ({ uid: o.uid, owner: o.owner, validTo: o.validTo }))
        )}`
      )

      const ethFlowOrderOwners = expiredOrders.length
        ? await onChainPlacedOrdersRepository.getAccountsForOrders(
            chainId,
            expiredOrders.map((o) => o.uid)
          )
        : {}

      logger.debug(`${this.prefix} on-chain placed order owners resolved: ${JSON.stringify(ethFlowOrderOwners)}`)

      const notifications = await Promise.all(
        expiredOrders.map((order) => {
          const isEthFlowOrder = areAddressesEqual(ethFlowAddress, order.owner)

          const orderOwner = isEthFlowOrder
            ? Object.keys(ethFlowOrderOwners).find((key) => {
                const orderUids = ethFlowOrderOwners[key]

                // order.uid is a 56-byte order digest, not an address, so getAddressKey() would leave it untouched: plain lowercase is correct here.
                return orderUids.includes(order.uid.toLowerCase())
              })
            : getAddressKey(order.owner)

          if (!orderOwner) {
            logger.warn(
              `${this.prefix} could not resolve owner for expired order ${order.uid} (raw owner=${order.owner}, isEthFlowOrder=${isEthFlowOrder}), skipping notification`
            )
            return Promise.resolve(undefined)
          }

          logger.debug(
            `${this.prefix} resolved owner ${orderOwner} for expired order ${order.uid} (isEthFlowOrder=${isEthFlowOrder})`
          )

          return getExpiredOrderNotification(order, {
            chainId,
            nowTimestamp,
            lastCheckTimestamp,
            isEthFlowOrder,
            owner: orderOwner,
            erc20Repository,
          })
        })
      )

      if (notifications.length > 0) {
        logger.info(
          `${this.prefix} Sending ${notifications.length} notifications`,
          JSON.stringify(notifications, null, 2)
        )

        // Post notifications to queue
        pushNotificationsRepository.send(notifications.filter(isTruthy))
      }
    } else {
      logger.debug(
        `${this.prefix} no previous state found (stateRegistry=${JSON.stringify(
          stateRegistry
        )}), skipping this cycle and just recording lastCheckTimestamp=${nowTimestamp}`
      )
    }

    await indexerStateRepository.upsert<ExpiredOrdersNotificationProducerState>(
      PRODUCER_NAME,
      { lastCheckTimestamp: nowTimestamp.toString() },
      chainId
    )
  }
}
