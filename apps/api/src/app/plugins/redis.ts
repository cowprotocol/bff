import fastifyRedis, { FastifyRedisPluginOptions } from '@fastify/redis';

import fp from 'fastify-plugin';
import { redisClient } from '@cowprotocol/repositories';

export default fp(async (fastify, opts) => {
  if (redisClient) {
    const options: FastifyRedisPluginOptions = {
      ...opts,
      client: redisClient,
    };
    fastify.register(fastifyRedis, options);
  }
});
