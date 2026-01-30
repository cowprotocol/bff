import { FastifyPluginAsync } from 'fastify';
import { FromSchema, JSONSchema } from 'json-schema-to-ts';
import { AddressSchema } from '../../../../schemas';
import { apiContainer } from '../../../../inversify.config';
import {
  AffiliateStatsService,
  affiliateStatsServiceSymbol,
} from '@cowprotocol/services';
import { isDuneEnabled } from '@cowprotocol/repositories';

const paramsSchema = {
  type: 'object',
  required: ['address'],
  additionalProperties: false,
  properties: {
    address: AddressSchema,
  },
} as const satisfies JSONSchema;

const affiliateStatsSchema = {
  type: 'object',
  required: [
    'affiliate_address',
    'referrer_code',
    'total_volume',
    'trigger_volume',
    'total_earned',
    'paid_out',
    'next_payout',
    'left_to_next_reward',
    'active_traders',
    'total_traders',
    'lastUpdatedAt',
  ],
  additionalProperties: false,
  properties: {
    affiliate_address: { type: 'string' },
    referrer_code: { type: 'string' },
    total_volume: { type: 'number' },
    trigger_volume: { type: 'number' },
    total_earned: { type: 'number' },
    paid_out: { type: 'number' },
    next_payout: { type: 'number' },
    left_to_next_reward: { type: 'number' },
    active_traders: { type: 'number' },
    total_traders: { type: 'number' },
    lastUpdatedAt: { type: 'string' },
  },
} as const satisfies JSONSchema;

const responseSchema = affiliateStatsSchema;

const errorSchema = {
  type: 'object',
  required: ['message'],
  additionalProperties: false,
  properties: {
    message: { type: 'string' },
  },
} as const satisfies JSONSchema;

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
