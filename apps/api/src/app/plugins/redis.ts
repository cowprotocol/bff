import fastifyRedis, { FastifyRedisPluginOptions } from '@fastify/redis';


import fp from "fastify-plugin";
import { redis } from '../connections/redis';

export default fp(async (fastify, opts) => {
  if (redis) {
    const options: FastifyRedisPluginOptions = {
      ...opts,
      client: redis
    };
    fastify.register(fastifyRedis, options);
  }
});
