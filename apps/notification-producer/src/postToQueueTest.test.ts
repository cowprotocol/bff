import {
  NOTIFICATIONS_QUEUE,
  connectToChannel,
  sendNotificationsToQueue,
} from '@cowprotocol/notifications';

it('Post to queue', async () => {
  const { channel } = await connectToChannel({
    channel: NOTIFICATIONS_QUEUE,
  });

  sendNotificationsToQueue({
    channel,
    queue: NOTIFICATIONS_QUEUE,
    notifications: [
      {
        id: '1',
        title: 'title',
        message:
          '{"title": "my title", "message": "my message", "account": "0x79063d9173C09887d536924E2F6eADbaBAc099f5", "url": "https://www.google.com"}',
        account: '0x79063d9173C09887d536924E2F6eADbaBAc099f5',
        url: 'url',
      },
    ],
  });
});
