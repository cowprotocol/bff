import { FastifyPluginAsync } from 'fastify';
import { FromSchema } from 'json-schema-to-ts';
import { PoolInfo } from '../../../data/poolInfo';
import {
  errorSchema,
  paramsSchema,
  poolsAverageAprBodySchema,
} from './schemas';
import { trimDoubleQuotes } from './utils';
import {
  CACHE_CONTROL_HEADER,
  getCacheControlHeaderValue,
} from '../../../../utils/cache';

type RouteSchema = FromSchema<typeof paramsSchema>;
type SuccessSchema = FromSchema<typeof poolsAverageAprBodySchema>;
type ErrorSchema = FromSchema<typeof errorSchema>;

interface PoolInfoResult {
  project: string;
  average_apr: number;
}

const CACHE_SECONDS = 21600; // 6 hours

const root: FastifyPluginAsync = async (fastify): Promise<void> => {
  fastify.get<{
    Params: RouteSchema;
    Reply: SuccessSchema | ErrorSchema;
  }>(
    '/pools-average-apr',
    {
      schema: {
        params: paramsSchema,
        response: {
          '2XX': poolsAverageAprBodySchema,
          '400': errorSchema,
        },
      },
    },
    async function (request, reply) {
      const { chainId } = request.params;

      const poolInfoRepository = fastify.orm.analytics.getRepository(PoolInfo);

      const result = await poolInfoRepository.query(`
          SELECT project,
                 AVG(apr) AS average_apr
          FROM cow_amm_competitor_info
          WHERE chain_id = ${chainId}
          GROUP BY project;
      `);

      const averageApr = result.reduce(
        (acc: Record<string, number>, val: PoolInfoResult) => {
          const projectName = trimDoubleQuotes(val.project);

          acc[projectName] = +val.average_apr.toFixed(6);

          return acc;
        },
        {}
      );

      reply.header(
        CACHE_CONTROL_HEADER,
        getCacheControlHeaderValue(CACHE_SECONDS)
      );
      reply.status(200).send(averageApr);
    }
  );
};

export default root;
