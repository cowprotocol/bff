import { FastifyPluginAsync } from 'fastify'
import { FromSchema } from 'json-schema-to-ts'
import TelegramBot from 'node-telegram-bot-api'
import {
  CacheRepository,
  cacheRepositorySymbol,
  createConnectToken,
  isCmsEnabled,
  PushSubscriptionsRepository,
  pushSubscriptionsRepositorySymbol,
  redisClient,
} from '@cowprotocol/repositories'
import { logger } from '@cowprotocol/shared'

import { apiContainer } from '../../../../inversify.config'
import { buildTelegramDeepLink, buildTelegramUnsubscribeDeepLink } from './buildTelegramDeepLink'
import { paramsSchema } from './telegram.schemas'

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
    logger.error(
      error,
      'Failed to resolve the Telegram bot username via getMe(). Telegram connect-token routes will not be registered.'
    )
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
    Reply: { connected: boolean; botDeepLink: string }
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

      reply.send({
        connected: subscriptions.length > 0,
        // Unsubscribing only happens from the bot side (it can prove which Telegram
        // chat is asking), so the frontend just needs a link to open the bot with
        // "/unsubscribe" pre-filled - not a fresh single-use connect-token. Pre-filling
        // (rather than a bare chat link) means it still works if the user deleted their
        // chat with the bot and lost the original "Unsubscribe" button.
        botDeepLink: buildTelegramUnsubscribeDeepLink(telegramBotUsername),
      })
    }
  )
}

export default telegram
