import { FastifyPluginAsync } from 'fastify';
import { FromSchema } from 'json-schema-to-ts';
import { PoolInfo } from '../../../data/poolInfo';
import { In } from 'typeorm';
import {
  poolsInfoBodySchema,
  errorSchema,
  paramsSchema,
  poolsInfoSuccessSchema,
} from './schemas';
import { POOLS_QUERY_CACHE, POOLS_RESULT_LIMIT } from './const';
import { trimDoubleQuotes } from './utils';
import { isDbEnabled } from '@cowprotocol/repositories';

type RouteSchema = FromSchema<typeof paramsSchema>;
type SuccessSchema = FromSchema<typeof poolsInfoSuccessSchema>;
type ErrorSchema = FromSchema<typeof errorSchema>;
type BodySchema = FromSchema<typeof poolsInfoBodySchema>;

const root: FastifyPluginAsync = async (fastify): Promise<void> => {
  if (!isDbEnabled) {
    fastify.log.warn(
      'Database is disabled. /pools endpoint will not be available'
    );
    return;
  }

  fastify.post<{
    Params: RouteSchema;
    Reply: SuccessSchema | ErrorSchema;
    Body: BodySchema;
  }>(
    '/pools',
    {
      schema: {
        params: paramsSchema,
        response: {
          '2XX': poolsInfoSuccessSchema,
          '400': errorSchema,
        },
        tags: ['yield'],
        body: poolsInfoBodySchema,
      },
    },
    async function (request, reply) {
      const { chainId } = request.params;
      const poolsAddresses = request.body;

      const poolInfoRepository = fastify.orm.analytics.getRepository(PoolInfo);

      const results = await poolInfoRepository.find({
        take: POOLS_RESULT_LIMIT,
        where: {
          ...(poolsAddresses.length > 0
            ? { contract_address: In(poolsAddresses) }
            : null),
          chain_id: chainId,
        },
        cache: POOLS_QUERY_CACHE,
      });

      const mappedResults = results.map((res) => {
        return {
          ...res,
          project: trimDoubleQuotes(res.project),
        };
      });

      reply.status(200).send(mappedResults);
    }
  );
};

export default root;
