import { FastifyPluginAsync } from 'fastify'
import { FromSchema } from 'json-schema-to-ts'
import { apiContainer } from '../../../../inversify.config'
import { AffiliateStatsService, affiliateStatsServiceSymbol } from '@cowprotocol/services'
import { isDuneEnabled } from '@cowprotocol/repositories'
import { errorSchema, paramsSchema, responseSchema } from './traderActivity.schemas'

type ParamsSchema = FromSchema<typeof paramsSchema>
type ResponseSchema = FromSchema<typeof responseSchema> | FromSchema<typeof errorSchema>

const traderActivity: FastifyPluginAsync = async (fastify): Promise<void> => {
  if (!isDuneEnabled) {
    fastify.log.warn('DUNE_API_KEY is not set. Skipping affiliate trader activity endpoint.')
    return
  }

  fastify.get<{ Params: ParamsSchema; Reply: ResponseSchema }>(
    '/',
    {
      schema: {
        description: 'Get affiliate trader activity from Dune Analytics',
        tags: ['affiliate'],
        params: paramsSchema,
        response: {
          200: responseSchema,
          500: errorSchema,
        },
      },
    },
    async function (request, reply) {
      try {
        const affiliateStatsService = apiContainer.get<AffiliateStatsService>(affiliateStatsServiceSymbol)
        const result = await affiliateStatsService.getTraderActivity(request.params.address)

        return reply.send(result)
      } catch (error) {
        fastify.log.error({ err: error }, 'Error fetching affiliate trader activity')
        return reply.status(500).send({ message: 'Unexpected error' })
      }
    }
  )
}

export default traderActivity
