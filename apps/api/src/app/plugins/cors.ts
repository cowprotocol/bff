import cors, { FastifyCorsOptions } from '@fastify/cors';
import fp from 'fastify-plugin';

export default fp(async (fastify, opts) => {
  const options: FastifyCorsOptions = {
    ...opts,
    origin: false,
    delegator: (req, callback) => {
      const corsOptions = {
        origin: false,
      };

      // do not include CORS headers for requests from localhost
      const origin = req.headers.origin;
      if (origin && /^http:\/\/localhost/.test(origin)) {
        corsOptions.origin = true;
      }

      // callback expects two parameters: error and options
      callback(null, corsOptions);
    },
  };
  fastify.register(cors, options);
});
