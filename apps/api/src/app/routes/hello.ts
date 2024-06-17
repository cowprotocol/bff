import { FastifyPluginAsync } from 'fastify';
import { sleep } from '@cowprotocol/notifications';

const root: FastifyPluginAsync = async (fastify): Promise<void> => {
  fastify.get('/hello', async function (request, reply) {
    await sleep(2000)
    reply.send({ hello: 'world' })
  });
};

export default root;
