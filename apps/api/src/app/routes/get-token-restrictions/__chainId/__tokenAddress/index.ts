import { FastifyPluginAsync } from 'fastify'
import { FromSchema } from 'json-schema-to-ts'
import { CACHE_CONTROL_HEADER, getCacheControlHeaderValue } from '../../../../../utils/cache'
import {
  tokenRestrictionsErrorSchema,
  tokenRestrictionsParamsSchema,
  tokenRestrictionsQuerySchema,
  tokenRestrictionsResponseSchema,
} from './tokenRestrictions.schemas'
import { TokenRestrictionsService } from './tokenRestrictions.service'

import type {} from '@fastify/caching'

const CACHE_SECONDS = 5 * 60

type TokenRestrictionsParams = FromSchema<typeof tokenRestrictionsParamsSchema>
type TokenRestrictionsQuery = FromSchema<typeof tokenRestrictionsQuerySchema>
type TokenRestrictionsResponse = FromSchema<typeof tokenRestrictionsResponseSchema>
type TokenRestrictionsError = FromSchema<typeof tokenRestrictionsErrorSchema>

const tokenRestrictions: FastifyPluginAsync = async (fastify): Promise<void> => {
  const service = new TokenRestrictionsService(fastify.log)

  // Load the lists on start, without blocking the server boot. Requests await the same load.
  service.load().catch((error) => fastify.log.error(error, 'Failed to load restricted token lists on start'))

  fastify.get<{
    Params: TokenRestrictionsParams
    Querystring: TokenRestrictionsQuery
    Reply: TokenRestrictionsResponse | TokenRestrictionsError
  }>(
    '/',
    {
      schema: {
        params: tokenRestrictionsParamsSchema,
        querystring: tokenRestrictionsQuerySchema,
        response: {
          200: tokenRestrictionsResponseSchema,
          503: tokenRestrictionsErrorSchema,
        },
      },
    },
    async (request, reply) => {
      const { chainId, tokenAddress } = request.params

      try {
        const restriction = await service.getRestriction(chainId, tokenAddress, request.query.countryCode)
        reply.header(CACHE_CONTROL_HEADER, getCacheControlHeaderValue(CACHE_SECONDS))
        return reply.send(restriction)
      } catch (error) {
        fastify.log.error(error, 'Failed to load restricted token lists')
        return reply.code(503).send({ message: 'Restricted token lists unavailable' })
      }
    }
  )
}

export default tokenRestrictions
