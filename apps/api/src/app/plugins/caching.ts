import fastifyCaching, { FastifyCachingPluginOptions } from '@fastify/caching';
import fp from 'fastify-plugin';
import abstractCache from 'abstract-cache';
import { redisClient } from '@cowprotocol/repositories';

import 'abstract-cache-redis';

export default fp(async (fastify, opts) => {
  const options: FastifyCachingPluginOptions = {
    ...opts,

    ...(redisClient
      ? {
          cache: abstractCache({
            useAwait: false,
            driver: {
              name: 'abstract-cache-redis',
              options: {
                client: redisClient,
              },
            },
          }),
        }
      : {}),
  };
  fastify.register(fastifyCaching, options);
});
