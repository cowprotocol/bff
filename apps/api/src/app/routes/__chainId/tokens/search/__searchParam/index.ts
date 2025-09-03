import { getTokenListBySearchParam } from '@cowprotocol/repositories';
import { FastifyPluginAsync } from 'fastify';
import {
  errorSchema,
  ErrorSchema,
  paramsSchema,
  RouteSchema,
  successSchema,
  SuccessSchema,
} from './schemas';

const root: FastifyPluginAsync = async (fastify): Promise<void> => {
  // example: http://localhost:3010/1/tokens/search/USDC
  fastify.get<{
    Params: RouteSchema;
    Reply: SuccessSchema | ErrorSchema;
  }>(
    '/',
    {
      schema: {
        params: paramsSchema,
        response: {
          '2XX': successSchema,
          '404': errorSchema,
        },
      },
    },
    async function (request, reply) {
      const { chainId, searchParam } = request.params;

      try {
        const tokens = await getTokenListBySearchParam(chainId, searchParam);

        fastify.log.info(
          `Token search for "${searchParam}" on chain ${chainId}: ${tokens.length} tokens found`
        );

        reply.send(tokens);
      } catch (error) {
        fastify.log.error('Error searching tokens:', error);
        reply.code(500).send({
          message: 'Internal server error while searching tokens',
        });
      }
    }
  );
};

export default root;
