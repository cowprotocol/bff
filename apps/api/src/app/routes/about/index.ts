import { FastifyPluginAsync } from 'fastify';
import { version } from '../../../../../../package.json';

interface AboutResponse {
  name: string;
  version: string;
}

const example: FastifyPluginAsync = async (fastify): Promise<void> => {
  fastify.get<{ Reply: AboutResponse }>('/', async function (_request, reply) {
    return reply.send({
      name: 'BFF API',
      version,
    });
  });
};

export default example;
