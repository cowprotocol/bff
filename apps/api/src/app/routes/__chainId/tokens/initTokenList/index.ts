import { initTokenList } from '@cowprotocol/repositories';
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
  // example: http://localhost:3001/1/tokens/initTokenList
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
      const { chainId } = request.params;

      try {
        await initTokenList(chainId);

        fastify.log.info(`Token list initalized for chain ${chainId}`);

        reply.send(true);
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
