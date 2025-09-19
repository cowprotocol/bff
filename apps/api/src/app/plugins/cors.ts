import cors, { FastifyCorsOptions } from '@fastify/cors';
import fp from 'fastify-plugin';

export default fp(async (fastify, opts) => {
  const options: FastifyCorsOptions = {
    ...opts,
    hook: 'onRequest',
    preflight: true,
    strictPreflight: false,
    origin: true, // reflect request origin
    credentials: false,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS', 'HEAD'],
    allowedHeaders: [
      'authorization',
      'content-type',
      'x-requested-with',
      'affiliate',
      'baggage',
      'sentry-trace',
    ],
    exposedHeaders: ['content-length', 'content-type'],
    maxAge: 600,
  };

  fastify.register(cors, options);
});
