import { FastifyPluginAsync } from 'fastify';
import httpProxy from '@fastify/http-proxy';

const proxy: FastifyPluginAsync = async (fastify, opts): Promise<void> => {
  const upstream = fastify.config.PROXY_UPSTREAM;
  if (!upstream) {
    fastify.log.warn('PROXY_UPSTREAM is not set. Skipping proxy.');
    return;
  }

  fastify.register(httpProxy, {
    upstream,
    replyOptions: {
      rewriteRequestHeaders: (originalRequest: any, headers: any) => {
        return {
          ...headers,
          Origin: fastify.config.PROXY_ORIGIN,
          Host: fastify.config.PROXY_HOST,
        };
      },
    },
  });
};

export default proxy;
