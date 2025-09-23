import httpProxy from '@fastify/http-proxy';
import { FastifyPluginAsync } from 'fastify';

const DEFAULT_SOCKET_BASE_URL = 'https://dedicated-backend.bungee.exchange';

const proxy: FastifyPluginAsync = async (fastify, opts): Promise<void> => {
  const upstream = fastify.config.SOCKET_BASE_URL || DEFAULT_SOCKET_BASE_URL;
  const apiKey = fastify.config.SOCKET_API_KEY;
  if (!apiKey) {
    fastify.log.warn('SOCKET_API_KEY is not set. Skipping proxy.');
    return;
  }

  // Handle CORS preflight locally for socket routes
  fastify.options('/*', async (request, reply) => {
    const origin = (request.headers.origin as string) || '*';
    const acrm =
      (request.headers['access-control-request-method'] as string) || '';
    const acrh =
      (request.headers['access-control-request-headers'] as string) || '';

    reply
      .header('Access-Control-Allow-Origin', origin)
      .header('Vary', 'Origin')
      .header(
        'Access-Control-Allow-Methods',
        acrm || 'GET, POST, PUT, PATCH, DELETE, OPTIONS, HEAD'
      )
      .header(
        'Access-Control-Allow-Headers',
        acrh || 'authorization, content-type, x-requested-with'
      )
      .header('Access-Control-Max-Age', '600')
      .status(204)
      .send();
  });

  fastify.register(httpProxy, {
    upstream,
    // The route file is mounted under '/proxies/socket', rewrite that prefix to '/'
    rewritePrefix: '/',
    httpMethods: ['DELETE', 'GET', 'HEAD', 'PATCH', 'POST', 'PUT'],
    replyOptions: {
      rewriteRequestHeaders: (request, headers) => ({
        ...headers,
        'x-api-key': apiKey,
      }),
    },
    preHandler: async (request) => {
      fastify.log.debug(
        { url: request.url, method: request.method },
        `Proxying request to socket ${upstream}`
      );
    },
  });
};

export default proxy;
