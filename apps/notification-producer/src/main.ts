import 'reflect-metadata';
import { Runnable } from '../types';
import { NotificationsRepository } from './repositories/NotificationsRepository';
import { CmsNotificationProducer } from './producers/CmsNotificationProducer';
import { TradeNotificationProducer } from './producers/TradeNotificationProducer';
import { SubscriptionRepository } from './repositories/SubscriptionsRepository';
import { Pool } from 'pg';
import { NotificationsIndexerStateRepository } from './repositories/NotificationsIndexerStateRepository';
import { ALL_SUPPORTED_CHAIN_IDS } from '@cowprotocol/cow-sdk';
import ms from 'ms';

const TIMEOUT_STOP_PRODUCERS = ms(`30s`);

let shuttingDown = false;
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
  // Handle connection errors
  pool.on('error', (err) => {
    console.error('Unexpected error on idle database client', err);
    process.exit(-1);
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
    // new CmsNotificationProducer(repositories),

    // Trade producer: Fetch trade notifications
    ...ALL_SUPPORTED_CHAIN_IDS.map((chainId) => {
      return new TradeNotificationProducer({
        ...repositories,
        chainId,
      });
    }),
  ];

  // Run all producers in the background
  const promises = producers.map((producer) =>
    producer
      .start()
      .then(() => {
        if (!shuttingDown) producer.start();
      })
      .catch(() => {
        if (!shuttingDown) producer.start();
      })
  );

  // Wrap all producers in a promise
  const producersPromise = Promise.all(promises);

  // Cleanup resources on application termination
  process.on('SIGKILL', () => {
    gracefulShutdown(pool, producers, producersPromise).catch((error) => {
      console.error('Error during shutdown', error);
      process.exit(1);
    });
  });

  await producersPromise;
}

async function gracefulShutdown(
  pool: Pool,
  producers: Runnable[],
  producersPromise: Promise<void[]>
) {
  if (shuttingDown) return;
  shuttingDown = true;

  // Command all producers to stop
  console.log('Stopping producers...');

  const stopProducersPromise = Promise.all(
    producers.map((producer) => producer.stop())
  );

  const timeoutInGracePeriod = new Promise((resolve) =>
    setTimeout(() => {
      console.log(
        `Some of the producers did not stop in time (${
          TIMEOUT_STOP_PRODUCERS / 1000
        }s), forcing exit`
      );
      resolve(true);
    }, TIMEOUT_STOP_PRODUCERS)
  );

  await Promise.race([
    // Wait for all producers to actually stop
    stopProducersPromise.then(() => producersPromise),
    // Give some grace period (otherwise timeout)
    timeoutInGracePeriod,
  ]);

  await producersPromise;

  console.log('Closing database pool...');
  await pool.end();
  process.exit(0);
}

// Start the main loop
mainLoop().catch(console.error);
