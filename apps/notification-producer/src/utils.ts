import { sleep } from '@cowprotocol/notifications';

export async function doForever(
  name: string,
  callback: () => Promise<void>,
  waitTimeMilliseconds: number
) {
  // eslint-disable-next-line no-constant-condition
  while (true) {
    try {
      await callback();
    } catch (error) {
      console.error(`[${name}] Error `, error);
      console.log(
        `[notification-producer:main] Reconnecting in ${
          waitTimeMilliseconds / 1000
        }s...`
      );
    } finally {
      await sleep(waitTimeMilliseconds);
    }
  }
}
