import { Runnable } from '../types';
import { NotificationsRepository } from './NotificationsRepository';
import { CmsNotificationProducer } from './producers/CmsNotificationProducer';

/**
 * Main loop: Run and re-attempt on error
 */
async function mainLoop() {
  console.info('[notification-producer:main] Start notification producer');

  // TODO: Move to DI
  const notificationsRepository = new NotificationsRepository();

  // Create all producers
  const producers: Runnable[] = [
    // CMS producer: Fetch PUSH notifications
    new CmsNotificationProducer(notificationsRepository),
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
