import { FastifyPluginAsync } from 'fastify';
import { apiContainer } from '../inversify.config';
import { hooksServiceSymbol } from '@cowprotocol/services';
import {
  HooksService,
  Blockchain,
  Period,
  BLOCKCHAIN_VALUES,
  PERIOD_VALUES,
} from '@cowprotocol/services';
import {
  CACHE_CONTROL_HEADER,
  getCacheControlHeaderValue,
} from '../../utils/cache';
import ms from 'ms';

const CACHE_SECONDS = ms('5m') / 1000; // Cache for 5 minutes

interface HooksQuery {
  blockchain: Blockchain;
  period: Period;
  maxWaitTimeMs?: number;
}

interface HooksResponse {
  hooks: Array<{
    environment: string;
    block_time: string;
    is_bridging: boolean;
    success: boolean;
    app_code: string;
    destination_chain_id: number | null;
    destination_token_address: string | null;
    hook_type: string;
    app_id: string | null;
    target: string;
    gas_limit: number;
    app_hash: string;
    tx_hash: string;
  }>;
  count: number;
}

const hooks: FastifyPluginAsync = async (fastify): Promise<void> => {
  fastify.get<{ Querystring: HooksQuery; Reply: HooksResponse }>(
    '/hooks',
    {
      schema: {
        description: 'Get hooks data from Dune Analytics',
        tags: ['hooks'],
        querystring: {
          type: 'object',
          required: ['blockchain', 'period'],
          properties: {
            blockchain: {
              type: 'string',
              enum: BLOCKCHAIN_VALUES,
              description: 'Blockchain network to query',
            },
            period: {
              type: 'string',
              enum: PERIOD_VALUES,
              description: 'Time period for the query',
            },
            maxWaitTimeMs: {
              type: 'number',
              description:
                'Maximum time to wait for query execution in milliseconds',
            },
          },
        },
        response: {
          200: {
            type: 'object',
            properties: {
              hooks: {
                type: 'array',
                items: {
                  type: 'object',
                  properties: {
                    environment: { type: 'string' },
                    block_time: { type: 'string' },
                    is_bridging: { type: 'boolean' },
                    success: { type: 'boolean' },
                    app_code: { type: 'string' },
                    destination_chain_id: {
                      type: ['number', 'null'],
                    },
                    destination_token_address: {
                      type: ['string', 'null'],
                    },
                    hook_type: { type: 'string' },
                    app_id: {
                      type: ['string', 'null'],
                    },
                    target: { type: 'string' },
                    gas_limit: { type: 'number' },
                    app_hash: { type: 'string' },
                    tx_hash: { type: 'string' },
                  },
                },
              },
              count: { type: 'number' },
            },
          },
        },
      },
    },
    async function (request, reply) {
      reply.header(
        CACHE_CONTROL_HEADER,
        getCacheControlHeaderValue(CACHE_SECONDS)
      );

      try {
        const hooksService = apiContainer.get<HooksService>(hooksServiceSymbol);
        const hooks = await hooksService.getHooks({
          blockchain: request.query.blockchain,
          period: request.query.period,
          maxWaitTimeMs: request.query.maxWaitTimeMs,
        });

        return reply.send({
          hooks,
          count: hooks.length,
        });
      } catch (error) {
        fastify.log.error('Error fetching hooks:', error);
        return reply.status(500).send({
          hooks: [],
          count: 0,
        });
      }
    }
  );
};

export default hooks;
