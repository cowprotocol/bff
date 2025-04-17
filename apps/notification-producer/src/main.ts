import { NotificationsRepository } from './NotificationsRepository';
import { CmsNotificationProducer } from './producers/CmsNotificationProducer';

/**
 * Main loop: Run and re-attempt on error
 */
async function mainLoop() {
  console.info('[notification-producer:main] Start notification producer');

  // TODO: Move to DI
  const notificationsRepository = new NotificationsRepository();
  const cmsNotificationProducer = new CmsNotificationProducer(
    notificationsRepository
  );

  // Start the CMS notification producer
  await cmsNotificationProducer.start();
}

// Start the main loop
mainLoop().catch(console.error);
