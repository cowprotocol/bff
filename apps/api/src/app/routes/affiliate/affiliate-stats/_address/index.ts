import { FastifyPluginAsync } from 'fastify';
import { FromSchema } from 'json-schema-to-ts';
import { apiContainer } from '../../../../inversify.config';
import {
  AffiliateStatsService,
  affiliateStatsServiceSymbol,
} from '@cowprotocol/services';
import { isDuneEnabled } from '@cowprotocol/repositories';
import {
  errorSchema,
  paramsSchema,
  responseSchema,
} from './affiliateStats.schemas';

type ParamsSchema = FromSchema<typeof paramsSchema>;
type ResponseSchema = FromSchema<typeof responseSchema> | FromSchema<typeof errorSchema>;

const affiliateStats: FastifyPluginAsync = async (fastify): Promise<void> => {
  if (!isDuneEnabled) {
    fastify.log.warn(
      'DUNE_API_KEY is not set. Skipping affiliate stats endpoint.'
    );
    return;
  }

  fastify.get<{ Params: ParamsSchema; Reply: ResponseSchema }>(
    '/',
    {
      schema: {
        description: 'Get affiliate stats from Dune Analytics',
        tags: ['affiliate'],
        params: paramsSchema,
        response: {
          200: responseSchema,
          404: errorSchema,
        },
      },
    },
    async function (request, reply) {
      try {
        const affiliateStatsService = apiContainer.get<AffiliateStatsService>(
          affiliateStatsServiceSymbol
        );
        const result = await affiliateStatsService.getAffiliateStats(
          request.params.address
        );

        if (result.rows.length === 0) {
          return reply.status(404).send({ message: 'Affiliate stats not found' });
        }

        return reply.send({
          ...result.rows[0],
          lastUpdatedAt: result.lastUpdatedAt,
        });
      } catch (error) {
        fastify.log.error('Error fetching affiliate stats:', error);
        return reply.status(500).send({ message: 'Unexpected error' });
      }
    }
  );
};

export default affiliateStats;
