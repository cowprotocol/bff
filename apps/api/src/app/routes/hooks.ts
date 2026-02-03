import { FastifyPluginAsync } from 'fastify';
import { apiContainer } from '../inversify.config';
import { hooksServiceSymbol } from '@cowprotocol/services';
import {
  HooksService,
  Blockchain,
  Period,
  HookData,
} from '@cowprotocol/services';
import {
  CACHE_CONTROL_HEADER,
  getCacheControlHeaderValue,
} from '../../utils/cache';
import ms from 'ms';
import { isDuneEnabled } from '@cowprotocol/repositories';
import {
  hooksQuerySchema,
  hooksResponseSchema,
} from './hooks.schemas';

const CACHE_SECONDS = ms('5m') / 1000; // Cache for 5 minutes

interface HooksQuery {
  blockchain: Blockchain;
  period: Period;
  maxWaitTimeMs?: number;
  limit?: number;
  offset?: number;
}

interface HooksResponse {
  hooks: HookData[];
  count: number;
  error?: string;
}

const HOOKS_TAGS = ['hooks'] as const;

const hooks: FastifyPluginAsync = async (fastify): Promise<void> => {
  if (!isDuneEnabled) {
    fastify.log.warn('DUNE_API_KEY is not set. Skipping hooks endpoint.');
    return;
  }

  fastify.get<{ Querystring: HooksQuery; Reply: HooksResponse }>(
    '/hooks',
    {
      schema: {
        description: 'Get hooks data from Dune Analytics',
        tags: HOOKS_TAGS,
        querystring: hooksQuerySchema,
        response: {
          200: hooksResponseSchema,
        },
      },
    },
    async function (request, reply) {
      try {
        const hooksService = apiContainer.get<HooksService>(hooksServiceSymbol);
        const hooks = await hooksService.getHooks({
          blockchain: request.query.blockchain,
          period: request.query.period,
          maxWaitTimeMs: request.query.maxWaitTimeMs,
          limit: request.query.limit,
          offset: request.query.offset,
        });

        reply.header(
          CACHE_CONTROL_HEADER,
          getCacheControlHeaderValue(CACHE_SECONDS)
        );

        return reply.send({
          hooks,
          count: hooks.length,
        });
      } catch (error) {
        fastify.log.error('Error fetching hooks:', error);
        reply.header(CACHE_CONTROL_HEADER, 'no-store');
        return reply.status(500).send({
          hooks: [],
          count: 0,
          error: 'Internal server error while fetching hooks',
        });
      }
    }
  );

};

export default hooks;
