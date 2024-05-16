import {
  NOTIFICATIONS_QUEUE,
  connectToChannel,
  sendNotificationToQueue,
} from '@cowprotocol/notifications';

export async function main() {
  const channel = await connectToChannel({
    channel: NOTIFICATIONS_QUEUE,
  });

  sendNotificationToQueue({
    channel,
    queue: NOTIFICATIONS_QUEUE,
    notification: {
      id: '1',
      title: 'title',
      message: 'message',
      account: 'account',
      url: 'url',
    },
  });
}

main().catch(console.error);
