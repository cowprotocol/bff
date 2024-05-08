// console.log('Hello World');

import TelegramBot from 'node-telegram-bot-api';
import amqp from 'amqplib/callback_api';
import {
  NOTIFICATIONS_QUEUE,
  parseNotification,
} from '@cowprotocol/notifications';

// replace the value below with the Telegram token you receive from BotFather
const token = 'YOUR_TELEGRAM_BOT_TOKEN';

// Create a bot that uses 'polling' to fetch new updates
const bot = new TelegramBot(token, { polling: true });

// This object will hold the chat ids for all subscribed users
const subscribers: Record<number, string> = {}; // TODO: Load from CMS

// // Matches "/subscribe [whatever]"
// bot.onText(/\/subscribe (.+)/, (msg, match) => {
//   const chatId = msg.chat.id;
//   const code = match[1]; // the captured "whatever"

//   // Here you should validate the code and check if it's a valid code

//   // If the code is valid, add the chatId to the subscribers list
//   subscribers[chatId] = code;

//   bot.sendMessage(chatId, 'You have successfully subscribed to notifications.');
// });

// Connect to RabbitMQ server
amqp.connect('amqp://localhost', function (error0, connection) {
  if (error0) {
    throw error0;
  }

  // Create a channel
  connection.createChannel(function (error1, channel) {
    if (error1) {
      throw error1;
    }

    // This makes sure the queue is declared
    channel.assertQueue(NOTIFICATIONS_QUEUE, {
      durable: false,
    });

    console.log(' [*] Waiting for messages in %s', NOTIFICATIONS_QUEUE);

    // Consume messages from RabbitMQ
    channel.consume(
      NOTIFICATIONS_QUEUE,
      function (msg) {
        const message = msg.content.toString();
        const notification = parseNotification(message);

        // Send the message to all subscribers
        for (const chatId in subscribers) {
          bot.sendMessage(
            Number(chatId),
            `\
TITLE: ${notification.title}
MESSAGE: ${notification.message}
URL: ${notification.url ? notification.url : 'No URL provided'}`
          );
        }
      },
      {
        noAck: true,
      }
    );
  });
});
