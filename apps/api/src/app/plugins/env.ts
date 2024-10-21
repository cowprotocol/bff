import fastifyEnv from '@fastify/env';
import fp from 'fastify-plugin';

const schema = {
  type: 'object',
  required: [],
  properties: {
    LOG_LEVEL: {
      type: 'string',
    },
    COW_API_BASE_URL: {
      type: 'string',
    },
    PROXY_ORIGIN: {
      type: 'string',
    },
    PROXY_UPSTREAM: {
      type: 'string',
    },
    TWAP_BASE_URL: {
      type: 'string',
    },
    COINGECKO_API_KEY: {
      type: 'string',
    },
    GOLD_RUSH_API_KEY: {
      type: 'string',
    },
    TENDERLY_API_KEY: {
      type: 'string',
    },
    TENDERLY_PROJECT_NAME: {
      type: 'string',
    },
    TENDERLY_ORG_NAME: {
      type: 'string',
    },
    ETHPLORER_API_KEY: {
      type: 'string',
    },
  },
};

export default fp(async (fastify, opts) => {
  const options = {
    ...opts,
    schema,
    dotenv: true,
  };

  fastify.register(fastifyEnv, options);
});

declare module 'fastify' {
  interface FastifyInstance {
    config: {
      // Currently only supports string type like this.
      [K in keyof typeof schema.properties]: string;
    };
  }
}
