import { sleep } from '@cowprotocol/notifications';

export async function doForever(
  name: string,
  callback: (stop: () => void) => Promise<void>,
  waitTimeMilliseconds: number
) {
  // eslint-disable-next-line no-constant-condition
  let running = true;
  while (running) {
    const stop = () => {
      console.log(`[${name}] Stopped`);
      running = false;
    };

    try {
      await callback(stop);
    } catch (error) {
      console.error(`[${name}] Error `, error);
      console.log(
        `[${name}] Reconnecting in ${waitTimeMilliseconds / 1000}s...`
      );
    } finally {
      await sleep(waitTimeMilliseconds);
    }
  }
}
