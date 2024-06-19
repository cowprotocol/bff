import fastifyCaching, { FastifyCachingPluginOptions } from '@fastify/caching';
import fp from "fastify-plugin";
import abstractCache from 'abstract-cache'
import { redis } from '../connections/redis';
import 'abstract-cache-redis';



export default fp(async (fastify, opts) => {
  const options: FastifyCachingPluginOptions = {
    ...opts,

    ...(redis ? {
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


