import { FastifyPluginAsync } from 'fastify'
import { FromSchema, JSONSchema } from 'json-schema-to-ts'
import TelegramBot from 'node-telegram-bot-api'
import {
  CacheRepository,
  cacheRepositorySymbol,
  isCmsEnabled,
  PushSubscriptionsRepository,
  pushSubscriptionsRepositorySymbol,
  redisClient,
} from '@cowprotocol/repositories'
import { logger } from '@cowprotocol/shared'

import { ETHEREUM_ADDRESS_PATTERN } from '../../../../schemas'
import { apiContainer } from '../../../../inversify.config'
import { createConnectToken } from './connectToken'
import { buildTelegramDeepLink } from './buildTelegramDeepLink'

const paramsSchema = {
  type: 'object',
  required: ['account'],
  properties: {
    account: {
      title: 'account',
      description: 'Account of the user',
      type: 'string',
      pattern: ETHEREUM_ADDRESS_PATTERN,
    },
  },
} as const satisfies JSONSchema

type ParamsSchema = FromSchema<typeof paramsSchema>

const telegram: FastifyPluginAsync = async (fastify): Promise<void> => {
  if (!isCmsEnabled) {
    logger.warn('CMS is not enabled. Please check CMS_ENABLED and CMS_API_KEY environment variables')
    return
  }

  if (!process.env.TELEGRAM_SECRET) {
    logger.warn('TELEGRAM_SECRET is not set. Telegram connect-token routes will not be registered.')
    return
  }

  let telegramBotUsername: string
  try {
    const { username } = await new TelegramBot(process.env.TELEGRAM_SECRET, { polling: false }).getMe()
    if (!username) throw new Error('Telegram getMe() returned no username')
    telegramBotUsername = username
  } catch (error) {
    logger.error(error, 'Failed to resolve the Telegram bot username via getMe(). Telegram connect-token routes will not be registered.')
    return
  }

  if (!redisClient) {
    logger.warn(
      'REDIS is not configured — Telegram connect-tokens will not be resolvable by apps/telegram; set REDIS_HOST/REDIS_ENABLED.'
    )
  }

  const cacheRepository: CacheRepository = apiContainer.get(cacheRepositorySymbol)
  const pushSubscriptionsRepository: PushSubscriptionsRepository = apiContainer.get(pushSubscriptionsRepositorySymbol)

  // POST /accounts/:account/telegram/connect-token
  fastify.post<{
    Params: ParamsSchema
    Reply: { token: string; deepLink: string }
  }>(
    '/connect-token',
    {
      schema: {
        description: 'Create a single-use Telegram bot connect token for this account',
        tags: ['accounts', 'telegram'],
        params: paramsSchema,
      },
    },
    async function (request, reply) {
      const account = request.params.account.toLowerCase()
      const token = await createConnectToken(cacheRepository, account)

      reply.send({ token, deepLink: buildTelegramDeepLink(telegramBotUsername, token) })
    }
  )

  // GET /accounts/:account/telegram/connect-status
  fastify.get<{
    Params: ParamsSchema
    Reply: { connected: boolean; username?: string }
  }>(
    '/connect-status',
    {
      schema: {
        description: 'Check whether this account has a linked Telegram subscription',
        tags: ['accounts', 'telegram'],
        params: paramsSchema,
      },
    },
    async function (request, reply) {
      const account = request.params.account.toLowerCase()
      const subscriptions = await pushSubscriptionsRepository.getAllTelegramSubscriptionsForAccounts([account])

      reply.send({ connected: subscriptions.length > 0 })
    }
  )

  // DELETE /accounts/:account/telegram/subscription
  fastify.delete<{
    Params: ParamsSchema
    Reply: { success: true }
  }>(
    '/subscription',
    {
      schema: {
        description: "Unlink this account's Telegram subscription",
        tags: ['accounts', 'telegram'],
        params: paramsSchema,
      },
    },
    async function (request, reply) {
      const account = request.params.account.toLowerCase()
      await pushSubscriptionsRepository.unlinkTelegramSubscription({ account })

      reply.send({ success: true })
    }
  )
}

export default telegram
