import 'reflect-metadata';
import ms from 'ms';

import {
  ALL_SUPPORTED_CHAIN_IDS,
  SupportedChainId,
} from '@cowprotocol/cow-sdk';
import { logger } from '@cowprotocol/shared';

import { getTokenCacheRepository } from '@cowprotocol/services';

import { Runnable } from '../types';
import { TokenListUpdater } from './updater/updater';

const TIMEOUT_STOP_UPDATERS = ms(`30s`);

let shuttingDown = false;
/**
 * Main loop: Run and re-attempt on error
 */
async function mainLoop() {
  const chainIds = ALL_SUPPORTED_CHAIN_IDS;
  logger.info(
    `[tokenlist-updater:main] Start tokenlist updater for networks: ${chainIds.join(
      ', '
    )}`
  );

  const tokenCacheRepository = getTokenCacheRepository();

  const updaters: Runnable[] = [
    // TokenListUpdater: update token list for each chain
    ...chainIds
      .filter((chainId) => chainId !== SupportedChainId.SEPOLIA)
      .map((chainId, index) => {
        return new TokenListUpdater({
          tokenCacheRepository,
          chainId,
          delayInMilliseconds: index * 20 * 1000, // every 20 seconds
        });
      }),
  ];

  // Run all updaters in the background
  const promises = updaters.map((updater) => updater.start());

  // Wrap all updaters in a promise
  const updatersPromise = Promise.all(promises);

  // Cleanup resources on application termination
  const shutdown = () => {
    gracefulShutdown(updaters, updatersPromise).catch((error) => {
      logger.error(error, 'Error during shutdown');
      process.exit(1);
    });
  };

  process.on('SIGTERM', shutdown);
  process.on('SIGINT', shutdown);

  await updatersPromise;
}

async function gracefulShutdown(
  updaters: Runnable[],
  updatersPromise: Promise<void[]>
) {
  if (shuttingDown) return;
  shuttingDown = true;

  // Command all producers to stop
  logger.info(`Stopping ${updaters.length} updaters...`);

  const stopUpdatersPromise = Promise.all(
    updaters.map((updater) => updater.stop())
  );

  const timeoutInGracePeriod = new Promise((resolve) =>
    setTimeout(() => {
      logger.info(
        `Some of the updaters did not stop in time (${
          TIMEOUT_STOP_UPDATERS / 1000
        }s), forcing exit`
      );
      resolve(true);
    }, TIMEOUT_STOP_UPDATERS)
  );

  await Promise.race([
    // Wait for all producers to actually stop
    stopUpdatersPromise
      .then(() => updatersPromise)
      .then(() => logger.info('All updaters have been stopped')),
    // Give some grace period (otherwise timeout)
    timeoutInGracePeriod,
  ]);

  logger.info('Bye!');
  process.exit(0);
}

// Start the main loop
mainLoop().catch((error) => logger.error(error, 'Unhandled error in updater'));
