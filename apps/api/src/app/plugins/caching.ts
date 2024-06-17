import fastifyCaching, { FastifyCachingPluginOptions } from '@fastify/caching';
import fp from "fastify-plugin";
import abstractCache from 'abstract-cache'
import { redis } from '../connections/redis';


const isRedisEnabled = process.env.REDIS_ENABLED === 'true';

export default fp(async (fastify, opts) => {
  const options: FastifyCachingPluginOptions = {
    ...opts,
    // privacy: fastifyCaching.privacy.NOCACHE,
    // privacy: fastifyCaching.privacy.PUBLIC,
    // expiresIn: 3600,     // Time in seconds

    ...(isRedisEnabled ? {
      cache: abstractCache({
        useAwait: false,
        driver: {
          name: 'abstract-cache-redis', // must be installed via `npm i`
          options: {
            client: redis
          }
        }
      })
    } : {})
  };
  fastify.register(fastifyCaching, options);
});


