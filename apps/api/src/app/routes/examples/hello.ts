import { FastifyPluginAsync } from 'fastify';
import { CACHE_CONTROL_HEADER as CACHE_CONTROL_HEADER, getCacheControlHeaderValue } from '../../../utils/cache';
import { delay } from '../../../utils/misc';

const root: FastifyPluginAsync = async (fastify): Promise<void> => {
  fastify.get('/hello', async function (request, reply) {
    await delay(2000)
    reply.send({ hello: 'world' })
  });

  fastify.get('/hello-cached', async function (request, reply) {
    await delay(2000)
    console.log('Setting cache header')
    reply.header(CACHE_CONTROL_HEADER, getCacheControlHeaderValue(10))
    reply.send({ hello: 'world' })
  });
};

export default root;
