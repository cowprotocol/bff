import 'reflect-metadata'

import {
  getCacheRepository,
  getErc20Repository,
  getExpiredOrdersRepository,
  getIndexerStateRepository,
  getOnChainPlacedOrdersRepository,
  getOrdersAppDataRepository,
  getOrdersRepository,
  getPushNotificationsRepository,
  getPushSubscriptionsRepository,
} from '@cowprotocol/services'

import { Runnable } from '../types'
import { TradeNotificationProducer } from './producers/trade/TradeNotificationProducer'
import { ExpiredOrdersNotificationProducer } from './producers/expired-orders/ExpiredOrdersNotificationProducer'
import ms from 'ms'
import { CmsNotificationProducer } from './producers/cms/CmsNotificationProducer'
import { EVM_CHAIN_IDS, logger } from '@cowprotocol/shared'

const TIMEOUT_STOP_PRODUCERS = ms(`30s`)

let shuttingDown = false
/**
 * Main loop: Run and re-attempt on error
 */
async function mainLoop() {
  const chainIds = getProducerChains()
  logger.info(`[notification-producer:main] Start notification producer for networks: ${chainIds.join(', ')}`)

  const cacheRepository = getCacheRepository()
  const erc20Repository = getErc20Repository(cacheRepository)
  const pushNotificationsRepository = getPushNotificationsRepository()
  const pushSubscriptionsRepository = getPushSubscriptionsRepository()
  const indexerStateRepository = getIndexerStateRepository()
  const onChainPlacedOrdersRepository = getOnChainPlacedOrdersRepository()
  const expiredOrdersRepository = getExpiredOrdersRepository()
  const ordersAppDataRepository = getOrdersAppDataRepository()
  const ordersRepository = getOrdersRepository()

  const repositories = {
    pushNotificationsRepository,
    pushSubscriptionsRepository,
    indexerStateRepository,
    erc20Repository,
    onChainPlacedOrdersRepository,
    ordersAppDataRepository,
    ordersRepository,
  }

  // Create all producers
  const producers: Runnable[] = [
    // CMS producer: Fetch PUSH notifications
    new CmsNotificationProducer(repositories),

    // Trade producer: Fetch trade notifications
    ...chainIds.map((chainId) => {
      return new TradeNotificationProducer({
        ...repositories,
        chainId,
      })
    }),

    // Expired order producer
    ...chainIds.map((chainId) => {
      return new ExpiredOrdersNotificationProducer({
        chainId,
        ...repositories,
        expiredOrdersRepository,
      })
    }),
  ]

  // Run all producers in the background
  const promises = producers.map((producer) => producer.start())

  // Wrap all producers in a promise
  const producersPromise = Promise.all(promises)

  // Cleanup resources on application termination
  const shutdown = () => {
    if (shuttingDown) {
      // Already shutting down and another signal arrived (e.g. a second Ctrl+C): stop waiting and exit now
      logger.warn('Received another shutdown signal while already stopping. Forcing exit')
      process.exit(1)
    }

    gracefulShutdown(producers, producersPromise).catch((error) => {
      logger.error(error, 'Error during shutdown')
      process.exit(1)
    })
  }

  process.on('SIGTERM', shutdown)
  process.on('SIGINT', shutdown)

  await producersPromise
}

function getProducerChains() {
  // Comma-separated list of chain IDs to run the notification producer on
  const producerNetworks =
    process.env.NOTIFICATIONS_PRODUCER_CHAINS?.split(',').map((chain) => Number(chain.trim())) || []

  // Notification producers need an RPC client and on-chain settlement contracts, so only EVM chains
  // apply here (Solana is supported elsewhere in the repo, e.g. USD prices, just not by this app).
  if (producerNetworks.length === 0) {
    return EVM_CHAIN_IDS
  }

  return EVM_CHAIN_IDS.filter((chain) => producerNetworks.includes(chain))
}
async function gracefulShutdown(producers: Runnable[], producersPromise: Promise<void[]>) {
  if (shuttingDown) return
  shuttingDown = true

  // Command all producers to stop
  logger.info(`Stopping ${producers.length} producers...`)

  const stopProducersPromise = Promise.all(producers.map((producer) => producer.stop()))

  const timeoutInGracePeriod = new Promise((resolve) =>
    setTimeout(() => {
      logger.info(`Some of the producers did not stop in time (${TIMEOUT_STOP_PRODUCERS / 1000}s), forcing exit`)
      resolve(true)
    }, TIMEOUT_STOP_PRODUCERS)
  )

  await Promise.race([
    // Wait for all producers to actually stop
    stopProducersPromise.then(() => producersPromise).then(() => logger.info('All producers have been stopped')),
    // Give some grace period (otherwise timeout)
    timeoutInGracePeriod,
  ])

  logger.info('Bye!')
  process.exit(0)
}

// Start the main loop
mainLoop().catch((error) => logger.error(error, 'Unhandled error in producer'))
