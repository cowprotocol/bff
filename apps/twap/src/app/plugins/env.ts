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
    };
  }
}

module.exports.autoload = false;
