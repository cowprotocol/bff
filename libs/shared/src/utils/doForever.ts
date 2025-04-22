import { Logger } from '../types';
import { sleep } from './misc';

export async function doForever(params: {
  name: string;
  callback: (stop: () => void) => Promise<void>;
  waitTimeMilliseconds: number;
  logger: Logger;
}) {
  const { name, callback, waitTimeMilliseconds, logger } = params;

  logger.info(
    `[${params.name}] Starting. Running logic every ${
      waitTimeMilliseconds / 1000
    }s`
  );

  // eslint-disable-next-line no-constant-condition
  let running = true;

  const { wakeUpPromise, wakeUp } = createWakeUpPromise();

  while (running) {
    const stop = () => {
      logger.info(`[${name}] Stopping...`);
      wakeUp(); // Wake up if its sleeping (so it can end faster)
      running = false;
    };

    try {
      await callback(stop);
    } catch (error) {
      const errorName = error instanceof Error ? `: ${error.name}` : '';
      logger.error(error, `[${name}] Error${errorName}`);
      logger.info(`[${name}] Next-run in ${waitTimeMilliseconds / 1000}s...`);
    } finally {
      await Promise.race([sleep(waitTimeMilliseconds), wakeUpPromise]);
    }
  }
  logger.info(`[${name}] Stopped`);
}

function createWakeUpPromise(): {
  wakeUpPromise: Promise<unknown>;
  wakeUp: () => void;
} {
  let wakeUpResolve: ((value: unknown) => void) | undefined = undefined;
  const wakeUpPromise = new Promise((resolve) => {
    wakeUpResolve = resolve;
  });

  return {
    wakeUpPromise,
    wakeUp: () => {
      if (wakeUpResolve) {
        wakeUpResolve(undefined);
      } else {
        console.warn('WakeUp promise not initialized. Nothing to wake up.');
      }
    },
  };
}
