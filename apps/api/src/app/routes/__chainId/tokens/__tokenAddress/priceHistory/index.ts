import { FastifyPluginAsync } from 'fastify'
import { FromSchema } from 'json-schema-to-ts'
import { logger } from '@cowprotocol/shared'
import { CACHE_CONTROL_HEADER, getCacheControlHeaderValue } from '../../../../../../utils/cache'
import { CodexPriceHistoryProvider } from './codex.provider'
import {
  priceHistoryErrorSchema,
  priceHistoryParamsSchema,
  priceHistoryQuerySchema,
  priceHistoryResponseSchema,
} from './priceHistory.schemas'
import { PriceHistoryService } from './priceHistory.service'
import { PriceHistoryProvider } from './priceHistory.types'
import { UpstreamPriceHistoryProvider } from './upstream.provider'

import type {} from '@fastify/caching'
import type {} from '../../../../../plugins/env'

const CACHE_SECONDS = 30

type PriceHistoryParams = FromSchema<typeof priceHistoryParamsSchema>
type PriceHistoryQuery = FromSchema<typeof priceHistoryQuerySchema>
type PriceHistoryResponse = FromSchema<typeof priceHistoryResponseSchema>
type PriceHistoryError = FromSchema<typeof priceHistoryErrorSchema>

const priceHistory: FastifyPluginAsync = async (fastify): Promise<void> => {
  const providers: PriceHistoryProvider[] = []

  if (fastify.config.PRICE_HISTORY_UPSTREAM) {
    providers.push(new UpstreamPriceHistoryProvider(fastify.config.PRICE_HISTORY_UPSTREAM))
  } else {
    fastify.log.warn('PRICE_HISTORY_UPSTREAM is not set. Upstream price history provider is disabled.')
  }

  if (fastify.config.CODEX_API_KEY) {
    providers.push(new CodexPriceHistoryProvider(fastify.config.CODEX_API_KEY))
  } else {
    fastify.log.warn('CODEX_API_KEY is not set. Codex price history fallback is disabled.')
  }

  const service = new PriceHistoryService(providers, fastify.config.PRICE_HISTORY_PROVIDER_ORDER, logger)

  fastify.get<{
    Params: PriceHistoryParams
    Querystring: PriceHistoryQuery
    Reply: PriceHistoryResponse | PriceHistoryError
  }>(
    '/',
    {
      schema: {
        params: priceHistoryParamsSchema,
        querystring: priceHistoryQuerySchema,
        response: {
          200: priceHistoryResponseSchema,
          '400': priceHistoryErrorSchema,
          '502': priceHistoryErrorSchema,
          '503': priceHistoryErrorSchema,
          '504': priceHistoryErrorSchema,
        },
      },
    },
    async (request, reply) => {
      if (request.query.from >= request.query.to) {
        return reply.code(400).send({ message: '`from` must be lower than `to`' })
      }

      try {
        const result = await service.getPriceHistory({
          chainId: request.params.chainId,
          tokenAddress: request.params.tokenAddress,
          ...request.query,
        })

        reply.header(CACHE_CONTROL_HEADER, getCacheControlHeaderValue(CACHE_SECONDS))
        return reply.send(result)
      } catch {
        return reply.code(502).send({ message: 'Price history providers failed' })
      }
    }
  )
}

export default priceHistory
