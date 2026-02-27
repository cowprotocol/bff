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
    PROXY_HOST: {
      type: 'string',
    },
    PROXY_UPSTREAM: {
      type: 'string',
    },
    SOCKET_API_KEY: {
      type: 'string',
    },
    SOCKET_BASE_URL: {
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
    MORALIS_API_KEY: {
      type: 'string',
    },

    // CoW Analytics DB
    COW_ANALYTICS_DATABASE_NAME: {
      type: 'string',
    },
    COW_ANALYTICS_DATABASE_HOST: {
      type: 'string',
    },
    COW_ANALYTICS_DATABASE_PORT: {
      type: 'number',
    },
    COW_ANALYTICS_DATABASE_USERNAME: {
      type: 'string',
    },
    COW_ANALYTICS_DATABASE_PASSWORD: {
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
