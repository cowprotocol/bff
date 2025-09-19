import cors, { FastifyCorsOptions } from '@fastify/cors';
import fp from 'fastify-plugin';

export default fp(async (fastify, opts) => {
  const options: FastifyCorsOptions = {
    ...opts,
    origin: false,
    preflight: false, // let routes handle OPTIONS explicitly
    delegator: (req, callback) => {
      const corsOptions: FastifyCorsOptions = {
        origin: false,
      };

      const origin = req.headers.origin as string | undefined;
      if (origin && /^http:\/\/localhost/.test(origin)) {
        corsOptions.origin = true;
      }

      callback(null, corsOptions);
    },
  };
  fastify.register(cors, options);
});
