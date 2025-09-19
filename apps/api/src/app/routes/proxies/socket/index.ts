import httpProxy from '@fastify/http-proxy';
import { FastifyPluginAsync } from 'fastify';

const SOCKET_BASE_URL =
  process.env.SOCKET_BASE_URL || 'https://dedicated-backend.bungee.exchange';

const proxy: FastifyPluginAsync = async (fastify, opts): Promise<void> => {
  const apiKey = fastify.config.SOCKET_API_KEY;
  if (!apiKey) {
    fastify.log.warn('SOCKET_API_KEY is not set. Skipping proxy.');
    return;
  }

  fastify.register(httpProxy, {
    upstream: SOCKET_BASE_URL,
    replyOptions: {
      rewriteRequestHeaders: (request, headers) => ({
        ...headers,
        'x-api-key': apiKey,
      }),
    },
    preHandler: async (request) => {
      fastify.log.info(
        { url: request.url, method: request.method },
        `Request socket proxy`
      );
    },
  });
};

export default proxy;
