import { CacheRepository, PushSubscriptionsRepository } from '@cowprotocol/repositories'
import { logger } from '@cowprotocol/shared'
import TelegramBot from 'node-telegram-bot-api'

const TOKEN_PREFIX = 'telegram-connect:'

const START_COMMAND_PATTERN = /^\/start(?:\s+(\S+))?/

export function parseStartCommand(text: string | undefined): string | null {
  if (!text) return null

  const match = text.match(START_COMMAND_PATTERN)

  return match?.[1] ?? null
}

async function lookupConnectToken(cacheRepository: CacheRepository, token: string): Promise<string | null> {
  return cacheRepository.get(TOKEN_PREFIX + token)
}

async function invalidateConnectToken(cacheRepository: CacheRepository, token: string): Promise<void> {
  await cacheRepository.set(TOKEN_PREFIX + token, '', 1)
}

export async function handleStartCommand(params: {
  bot: TelegramBot
  msg: TelegramBot.Message
  cacheRepository: CacheRepository
  pushSubscriptionsRepository: PushSubscriptionsRepository
}): Promise<void> {
  const { bot, msg, cacheRepository, pushSubscriptionsRepository } = params
  const token = parseStartCommand(msg.text)

  if (!token) return

  const account = await lookupConnectToken(cacheRepository, token)

  if (!account) {
    await bot.sendMessage(msg.chat.id, 'This link has expired — please reconnect from CoW Swap.')
    return
  }

  try {
    await pushSubscriptionsRepository.linkTelegramSubscription({
      account,
      chatId: msg.chat.id,
      firstName: msg.from?.first_name,
      username: msg.from?.username,
    })
  } catch (error) {
    logger.error(error, '[telegram] Error linking Telegram subscription')
    await bot.sendMessage(msg.chat.id, 'Something went wrong linking your account — please try again.')
    return
  }

  await invalidateConnectToken(cacheRepository, token)

  await bot.sendMessage(msg.chat.id, "You're connected! You'll now receive CoW Swap notifications here.")
}
