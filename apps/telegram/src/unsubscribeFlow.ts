import { PushSubscriptionsRepository } from '@cowprotocol/repositories'
import { logger } from '@cowprotocol/shared'
import TelegramBot from 'node-telegram-bot-api'

// Unsubscribing only happens here, from the bot side, since Telegram itself proves which
// chat is asking - the frontend/bff can no longer prove a caller owns a given wallet
// account, so it doesn't get an unsubscribe endpoint at all (see bff PR discussion).
const UNSUBSCRIBE_COMMAND_PATTERN = /^\/(unsubscribe|stop)\b/
export const UNSUBSCRIBE_MENU_CALLBACK_DATA = 'unsubscribe-menu'
const UNSUBSCRIBE_ACCOUNT_CALLBACK_PREFIX = 'unsubscribe:'

export function isUnsubscribeCommand(text: string | undefined): boolean {
  if (!text) return false
  return UNSUBSCRIBE_COMMAND_PATTERN.test(text)
}

export function buildUnsubscribeAccountCallbackData(account: string): string {
  return `${UNSUBSCRIBE_ACCOUNT_CALLBACK_PREFIX}${account}`
}

export function parseUnsubscribeAccountCallbackData(data: string | undefined): string | null {
  if (!data || !data.startsWith(UNSUBSCRIBE_ACCOUNT_CALLBACK_PREFIX)) return null
  return data.slice(UNSUBSCRIBE_ACCOUNT_CALLBACK_PREFIX.length)
}

function formatAccount(account: string): string {
  return `${account.slice(0, 6)}…${account.slice(-4)}`
}

async function unsubscribeAccount(params: {
  bot: TelegramBot
  chatId: number
  account: string
  pushSubscriptionsRepository: PushSubscriptionsRepository
}): Promise<void> {
  const { bot, chatId, account, pushSubscriptionsRepository } = params

  await pushSubscriptionsRepository.unlinkTelegramSubscription({ account })

  await bot.sendMessage(chatId, `You've been unsubscribed from CoW Swap notifications for ${formatAccount(account)}.`)
}

/**
 * Sends the unsubscribe entry point for this chat: unsubscribes directly if the chat
 * only has one linked account, otherwise shows a picker (a chat can be linked to more
 * than one wallet account).
 */
export async function sendUnsubscribeMenu(params: {
  bot: TelegramBot
  chatId: number
  pushSubscriptionsRepository: PushSubscriptionsRepository
}): Promise<void> {
  const { bot, chatId, pushSubscriptionsRepository } = params
  const subscriptions = await pushSubscriptionsRepository.getTelegramSubscriptionsForChatId(chatId)

  if (subscriptions.length === 0) {
    await bot.sendMessage(chatId, "You don't have any active CoW Swap notification subscriptions.")
    return
  }

  if (subscriptions.length === 1) {
    await unsubscribeAccount({ bot, chatId, account: subscriptions[0].account, pushSubscriptionsRepository })
    return
  }

  await bot.sendMessage(
    chatId,
    'This chat is linked to more than one account - which one do you want to unsubscribe?',
    {
      reply_markup: {
        inline_keyboard: subscriptions.map((subscription) => [
          {
            text: formatAccount(subscription.account),
            callback_data: buildUnsubscribeAccountCallbackData(subscription.account),
          },
        ]),
      },
    }
  )
}

export async function handleUnsubscribeCommand(params: {
  bot: TelegramBot
  msg: TelegramBot.Message
  pushSubscriptionsRepository: PushSubscriptionsRepository
}): Promise<void> {
  const { bot, msg, pushSubscriptionsRepository } = params

  if (!isUnsubscribeCommand(msg.text)) return

  await sendUnsubscribeMenu({ bot, chatId: msg.chat.id, pushSubscriptionsRepository })
}

export async function handleUnsubscribeCallback(params: {
  bot: TelegramBot
  query: TelegramBot.CallbackQuery
  pushSubscriptionsRepository: PushSubscriptionsRepository
}): Promise<void> {
  const { bot, query, pushSubscriptionsRepository } = params
  const chatId = query.message?.chat.id

  if (!chatId) return

  try {
    if (query.data === UNSUBSCRIBE_MENU_CALLBACK_DATA) {
      await sendUnsubscribeMenu({ bot, chatId, pushSubscriptionsRepository })
      await bot.answerCallbackQuery(query.id)
      return
    }

    const selectedAccount = parseUnsubscribeAccountCallbackData(query.data)

    if (!selectedAccount) return

    // Defense in depth: confirm the tapped account is actually linked to this chat
    // before deleting anything, rather than trusting callback_data at face value.
    const subscriptions = await pushSubscriptionsRepository.getTelegramSubscriptionsForChatId(chatId)
    const ownsAccount = subscriptions.some((subscription) => subscription.account === selectedAccount)

    if (!ownsAccount) {
      await bot.answerCallbackQuery(query.id, { text: 'That account is not linked to this chat.' })
      return
    }

    await unsubscribeAccount({ bot, chatId, account: selectedAccount, pushSubscriptionsRepository })
    await bot.answerCallbackQuery(query.id)
  } catch (error) {
    logger.error(error, '[telegram] Error handling unsubscribe callback')
    await bot.answerCallbackQuery(query.id, { text: 'Something went wrong - please try again.' }).catch(() => undefined)
  }
}
