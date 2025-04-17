import { Runnable } from '../types';
import { NotificationsRepository } from './repositories/NotificationsRepository';
import { CmsNotificationProducer } from './producers/CmsNotificationProducer';
import { TradeNotificationProducer } from './producers/TradeNotificationProducer';
import { SubscriptionRepository } from './repositories/SubscriptionsRepository';
import { Pool } from 'pg';
import { NotificationsIndexerStateRepository } from './repositories/NotificationsIndexerStateRepository';
import { ALL_SUPPORTED_CHAIN_IDS } from '@cowprotocol/cow-sdk';

/**
 * Main loop: Run and re-attempt on error
 */
async function mainLoop() {
  console.info('[notification-producer:main] Start notification producer');

  // TODO: Move to DI
  const pool = new Pool({
    user: process.env.POSTGRES_USER,
    host: process.env.POSTGRES_HOST,
    database: 'mainnet', // TODO: make this dynamic based on the chainId. The method passes the chainId
    password: process.env.POSTGRES_PASSWORD,
    port: Number(process.env.POSTGRES_PORT) || 5432,
  });
  const notificationsRepository = new NotificationsRepository();
  const subscriptionRepository = new SubscriptionRepository();
  const notificationsIndexerStateRepository =
    new NotificationsIndexerStateRepository(pool);

  const repositories = {
    notificationsRepository,
    subscriptionRepository,
    notificationsIndexerStateRepository,
  };

  // Create all producers
  const producers: Runnable[] = [
    // CMS producer: Fetch PUSH notifications
    new CmsNotificationProducer(repositories),

    // Trade producer: Fetch trade notifications
    ...ALL_SUPPORTED_CHAIN_IDS.map((chainId) => {
      return new TradeNotificationProducer({
        ...repositories,
        chainId,
      });
    }),
  ];

  const promises = [];
  for (const producer of producers) {
    // Run the producer in the background forever, and re-attempt on error (even-though runnables should not throw, we want to make sure a bug in a producer never affects another producer)
    promises.push(producer.start().then(producer.start).catch(producer.start));
  }

  // Wait for all producers
  await Promise.all(promises);
}

// Start the main loop
mainLoop().catch(console.error);
