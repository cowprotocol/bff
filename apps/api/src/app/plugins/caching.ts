import fastifyCaching, { FastifyCachingPluginOptions } from '@fastify/caching';
import fp from "fastify-plugin";
import abstractCache from 'abstract-cache'
import { redis } from '../connections/redis';


const isRedisEnabled = process.env.REDIS_ENABLED === 'true';

export default fp(async (fastify, opts) => {
  const options: FastifyCachingPluginOptions = {
    ...opts,

    ...(isRedisEnabled ? {
      cache: abstractCache({
        useAwait: false,
        driver: {
          name: 'abstract-cache-redis',
          options: {
            client: redis
          }
        }
      })
    } : {})
  };
  fastify.register(fastifyCaching, options);
});


