import fastifyEnv from '@fastify/env';
import fp from 'fastify-plugin';

const schema = {
  type: 'object',
  required: ['PROXY_ORIGIN', 'PROXY_UPSTREAM', 'COINGECKO_API_KEY'],
  properties: {
    LOG_LEVEL: {
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
