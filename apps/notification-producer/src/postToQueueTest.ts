import {
  NOTIFICATIONS_QUEUE,
  Notification,
  connectToChannel,
  sendNotificationToQueue,
} from '@cowprotocol/notifications';

export async function main() {
  const channel = await connectToChannel({
    channel: NOTIFICATIONS_QUEUE,
  });

  const notification: Notification = {
    id: '1234',
    title: "You've got MEVed!",
    message:
      'The MEV screw you again! this time 2,567$! Try to protect you next time',
    account: 'account',
    url: 'url',
  };
  console.log('[postToQueueTest] Post notification', notification);

  sendNotificationToQueue({
    channel,
    queue: NOTIFICATIONS_QUEUE,
    notification,
  });
}

main().catch(console.error);
