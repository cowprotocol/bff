import { FastifyPluginAsync } from 'fastify';

const root: FastifyPluginAsync = async (fastify): Promise<void> => {
  fastify.get('/', async function (request, reply) {
    reply.redirect(301, '/docs/static/index.html');
  });
};

export default root;
