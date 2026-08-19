import TelegramBot from 'node-telegram-bot-api'

import {
  buildUnsubscribeAccountCallbackData,
  handleUnsubscribeCallback,
  handleUnsubscribeCommand,
  isUnsubscribeCommand,
  UNSUBSCRIBE_MENU_CALLBACK_DATA,
} from './unsubscribeFlow'

describe('isUnsubscribeCommand', () => {
  it('matches /unsubscribe', () => {
    expect(isUnsubscribeCommand('/unsubscribe')).toBe(true)
  })

  it('matches /stop', () => {
    expect(isUnsubscribeCommand('/stop')).toBe(true)
  })

  it('does not match unrelated text', () => {
    expect(isUnsubscribeCommand('hello there')).toBe(false)
  })

  it('does not match undefined text', () => {
    expect(isUnsubscribeCommand(undefined)).toBe(false)
  })
})

function buildMsg(text: string) {
  return { text, chat: { id: 555 } } as TelegramBot.Message
}

describe('handleUnsubscribeCommand', () => {
  it('ignores non-unsubscribe messages', async () => {
    const getTelegramSubscriptionsForChatId = jest.fn()
    const pushSubscriptionsRepository = { getTelegramSubscriptionsForChatId } as any
    const bot = { sendMessage: jest.fn() } as any

    await handleUnsubscribeCommand({ bot, msg: buildMsg('hi'), pushSubscriptionsRepository })

    expect(getTelegramSubscriptionsForChatId).not.toHaveBeenCalled()
  })

  it('unsubscribes directly when the chat has exactly one linked account', async () => {
    const getTelegramSubscriptionsForChatId = jest.fn().mockResolvedValue([{ account: '0xabc', chatId: '555' }])
    const unlinkTelegramSubscription = jest.fn().mockResolvedValue(undefined)
    const pushSubscriptionsRepository = { getTelegramSubscriptionsForChatId, unlinkTelegramSubscription } as any
    const sendMessage = jest.fn()
    const bot = { sendMessage } as any

    await handleUnsubscribeCommand({ bot, msg: buildMsg('/unsubscribe'), pushSubscriptionsRepository })

    expect(unlinkTelegramSubscription).toHaveBeenCalledWith({ account: '0xabc' })
    expect(sendMessage).toHaveBeenCalledWith(555, expect.stringMatching(/unsubscribed/i))
  })

  it('shows a picker when the chat has more than one linked account', async () => {
    const getTelegramSubscriptionsForChatId = jest.fn().mockResolvedValue([
      { account: '0xaaa', chatId: '555' },
      { account: '0xbbb', chatId: '555' },
    ])
    const unlinkTelegramSubscription = jest.fn()
    const pushSubscriptionsRepository = { getTelegramSubscriptionsForChatId, unlinkTelegramSubscription } as any
    const sendMessage = jest.fn()
    const bot = { sendMessage } as any

    await handleUnsubscribeCommand({ bot, msg: buildMsg('/unsubscribe'), pushSubscriptionsRepository })

    expect(unlinkTelegramSubscription).not.toHaveBeenCalled()
    expect(sendMessage).toHaveBeenCalledWith(
      555,
      expect.any(String),
      expect.objectContaining({
        reply_markup: {
          inline_keyboard: [
            [{ text: expect.any(String), callback_data: buildUnsubscribeAccountCallbackData('0xaaa') }],
            [{ text: expect.any(String), callback_data: buildUnsubscribeAccountCallbackData('0xbbb') }],
          ],
        },
      })
    )
  })

  it('replies when the chat has no linked accounts', async () => {
    const getTelegramSubscriptionsForChatId = jest.fn().mockResolvedValue([])
    const unlinkTelegramSubscription = jest.fn()
    const pushSubscriptionsRepository = { getTelegramSubscriptionsForChatId, unlinkTelegramSubscription } as any
    const sendMessage = jest.fn()
    const bot = { sendMessage } as any

    await handleUnsubscribeCommand({ bot, msg: buildMsg('/stop'), pushSubscriptionsRepository })

    expect(unlinkTelegramSubscription).not.toHaveBeenCalled()
    expect(sendMessage).toHaveBeenCalledWith(555, expect.stringMatching(/don't have any active/i))
  })

  it('replies with an error message when the lookup fails, instead of leaving the user with no response', async () => {
    const getTelegramSubscriptionsForChatId = jest.fn().mockRejectedValue(new Error('cms unreachable'))
    const pushSubscriptionsRepository = { getTelegramSubscriptionsForChatId } as any
    const sendMessage = jest.fn()
    const bot = { sendMessage } as any

    await handleUnsubscribeCommand({ bot, msg: buildMsg('/unsubscribe'), pushSubscriptionsRepository })

    expect(sendMessage).toHaveBeenCalledWith(555, expect.stringMatching(/something went wrong/i))
  })
})

function buildCallbackQuery(data: string): TelegramBot.CallbackQuery {
  return {
    id: 'query-id',
    from: { id: 1, is_bot: false, first_name: 'Ada' },
    chat_instance: 'instance',
    data,
    message: { chat: { id: 555, type: 'private' } },
  } as unknown as TelegramBot.CallbackQuery
}

describe('handleUnsubscribeCallback', () => {
  it('shows the picker for the unsubscribe-menu callback', async () => {
    const getTelegramSubscriptionsForChatId = jest.fn().mockResolvedValue([
      { account: '0xaaa', chatId: '555' },
      { account: '0xbbb', chatId: '555' },
    ])
    const unlinkTelegramSubscription = jest.fn()
    const pushSubscriptionsRepository = { getTelegramSubscriptionsForChatId, unlinkTelegramSubscription } as any
    const sendMessage = jest.fn()
    const answerCallbackQuery = jest.fn()
    const bot = { sendMessage, answerCallbackQuery } as any

    await handleUnsubscribeCallback({
      bot,
      query: buildCallbackQuery(UNSUBSCRIBE_MENU_CALLBACK_DATA),
      pushSubscriptionsRepository,
    })

    expect(sendMessage).toHaveBeenCalled()
    expect(answerCallbackQuery).toHaveBeenCalledWith('query-id')
  })

  it('unsubscribes the selected account when it belongs to this chat', async () => {
    const getTelegramSubscriptionsForChatId = jest.fn().mockResolvedValue([
      { account: '0xaaa', chatId: '555' },
      { account: '0xbbb', chatId: '555' },
    ])
    const unlinkTelegramSubscription = jest.fn().mockResolvedValue(undefined)
    const pushSubscriptionsRepository = { getTelegramSubscriptionsForChatId, unlinkTelegramSubscription } as any
    const sendMessage = jest.fn()
    const answerCallbackQuery = jest.fn()
    const bot = { sendMessage, answerCallbackQuery } as any

    await handleUnsubscribeCallback({
      bot,
      query: buildCallbackQuery(buildUnsubscribeAccountCallbackData('0xbbb')),
      pushSubscriptionsRepository,
    })

    expect(unlinkTelegramSubscription).toHaveBeenCalledWith({ account: '0xbbb' })
    expect(sendMessage).toHaveBeenCalledWith(555, expect.stringMatching(/unsubscribed/i))
    expect(answerCallbackQuery).toHaveBeenCalledWith('query-id')
  })

  it('refuses to unsubscribe an account that is not linked to this chat', async () => {
    const getTelegramSubscriptionsForChatId = jest.fn().mockResolvedValue([{ account: '0xaaa', chatId: '555' }])
    const unlinkTelegramSubscription = jest.fn()
    const pushSubscriptionsRepository = { getTelegramSubscriptionsForChatId, unlinkTelegramSubscription } as any
    const answerCallbackQuery = jest.fn()
    const bot = { sendMessage: jest.fn(), answerCallbackQuery } as any

    await handleUnsubscribeCallback({
      bot,
      query: buildCallbackQuery(buildUnsubscribeAccountCallbackData('0xnotlinked')),
      pushSubscriptionsRepository,
    })

    expect(unlinkTelegramSubscription).not.toHaveBeenCalled()
    expect(answerCallbackQuery).toHaveBeenCalledWith('query-id', expect.objectContaining({ text: expect.any(String) }))
  })

  it('ignores callback queries with no data', async () => {
    const getTelegramSubscriptionsForChatId = jest.fn()
    const pushSubscriptionsRepository = { getTelegramSubscriptionsForChatId } as any
    const bot = { sendMessage: jest.fn(), answerCallbackQuery: jest.fn() } as any

    await handleUnsubscribeCallback({ bot, query: buildCallbackQuery(''), pushSubscriptionsRepository })

    expect(getTelegramSubscriptionsForChatId).not.toHaveBeenCalled()
  })
})
