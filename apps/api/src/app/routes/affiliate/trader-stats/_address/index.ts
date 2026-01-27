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

const traderStatsSchema = {
  type: 'object',
  required: [
    'trader_address',
    'bound_referrer_code',
    'linked_since',
    'rewards_end',
    'eligible_volume',
    'left_to_next_rewards',
    'trigger_volume',
    'total_earned',
    'paid_out',
    'next_payout',
  ],
  additionalProperties: false,
  properties: {
    trader_address: { type: 'string' },
    bound_referrer_code: { type: 'string' },
    linked_since: { type: 'string' },
    rewards_end: { type: 'string' },
    eligible_volume: { type: 'number' },
    left_to_next_rewards: { type: 'number' },
    trigger_volume: { type: 'number' },
    total_earned: { type: 'number' },
    paid_out: { type: 'number' },
    next_payout: { type: 'number' },
  },
} as const satisfies JSONSchema;

const responseSchema = traderStatsSchema;

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

const traderStats: FastifyPluginAsync = async (fastify): Promise<void> => {
  if (!isDuneEnabled) {
    fastify.log.warn(
      'DUNE_API_KEY is not set. Skipping affiliate trader stats endpoint.'
    );
    return;
  }

  fastify.get<{ Params: ParamsSchema; Reply: ResponseSchema }>(
    '/',
    {
      schema: {
        description: 'Get affiliate trader stats from Dune Analytics',
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
        const stats = await affiliateStatsService.getTraderStats(
          request.params.address
        );

        if (stats.length === 0) {
          return reply.status(404).send({ message: 'Trader stats not found' });
        }

        return reply.send(stats[0]);
      } catch (error) {
        fastify.log.error('Error fetching affiliate trader stats:', error);
        return reply.status(500).send({ message: 'Unexpected error' });
      }
    }
  );
};

export default traderStats;
