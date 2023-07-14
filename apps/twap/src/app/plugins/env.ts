import fp from 'fastify-plugin';
import fastifyEnv from '@fastify/env';

const schema = {
  type: 'object',
  required: [
    'DATABASE_NAME',
    'DATABASE_USERNAME',
    'DATABASE_PASSWORD',
    'DATABASE_HOST',
    'DATABASE_PORT',
    'ORDERBOOK_DATABASE_HOST',
    'ORDERBOOK_DATABASE_PORT',
    'ORDERBOOK_DATABASE_USERNAME',
    'ORDERBOOK_DATABASE_PASSWORD',
  ],
  properties: {
    DATABASE_NAME: {
      type: 'string',
    },
    DATABASE_HOST: {
      type: 'string',
    },
    DATABASE_PORT: {
      type: 'number',
    },
    DATABASE_USERNAME: {
      type: 'string',
    },
    DATABASE_PASSWORD: {
      type: 'string',
    },
    ORDERBOOK_DATABASE_HOST: {
      type: 'string',
    },
    ORDERBOOK_DATABASE_PORT: {
      type: 'number',
    },
    ORDERBOOK_DATABASE_USERNAME: {
      type: 'string',
    },
    ORDERBOOK_DATABASE_PASSWORD: {
      type: 'string',
    },
  },
};

export default fp(async (fastify, opts) => {
  const options = {
    ...opts,
    schema,
  };

  fastify.register(fastifyEnv, options);
});

declare module 'fastify' {
  interface FastifyInstance {
    config: {
      DATABASE_NAME: string;
      DATABASE_USERNAME: string;
      DATABASE_PASSWORD: string;
      DATABASE_HOST: string;
      DATABASE_PORT: number;
      ORDERBOOK_DATABASE_HOST: string;
      ORDERBOOK_DATABASE_PORT: number;
      ORDERBOOK_DATABASE_USERNAME: string;
      ORDERBOOK_DATABASE_PASSWORD: string;
    };
  }
}

module.exports.autoload = false;
