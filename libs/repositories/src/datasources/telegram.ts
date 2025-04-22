import assert from 'assert';

import TelegramBotClass from 'node-telegram-bot-api';

export type TelegramBot = TelegramBotClass;

export function createTelegramBot(): TelegramBot {
  const token = process.env.TELEGRAM_SECRET;
  assert(token, 'TELEGRAM_SECRET is required');
  return new TelegramBotClass(token, { polling: true });
}
