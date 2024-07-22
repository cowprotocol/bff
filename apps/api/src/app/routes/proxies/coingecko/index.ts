import httpProxy from '@fastify/http-proxy';
import {
  CACHE_CONTROL_HEADER,
  getCacheControlHeaderValue,
} from '../../../../utils/cache';
import { FastifyPluginAsync } from 'fastify';
import { COINGECKO_PRO_BASE_URL } from '@cowprotocol/repositories';
import { KeysOf } from 'fastify/types/type-provider';
import { IncomingHttpHeaders } from 'http2';

const DROP_HEADERS: KeysOf<IncomingHttpHeaders>[] = [
  'cf-ray',
  'cf-cache-status',
  'set-cookie',
  'server',
];

const CACHE_TTL = parseInt(process.env.COINGECKO_CACHING_TIME || '150'); // Defaults to 2.5 minutes (150 seconds)

const coingeckoProxy: FastifyPluginAsync = async (
  fastify,
  opts
): Promise<void> => {
  fastify.register(httpProxy, {
    upstream: COINGECKO_PRO_BASE_URL,
    rewritePrefix: '/api/v3/',
    replyOptions: {
      rewriteRequestHeaders: (request, headers) => ({
        ...headers,
        'x-cg-pro-api-key': fastify.config.COINGECKO_API_KEY,
      }),
      // Response headers https://github.com/fastify/fastify-reply-from?tab=readme-ov-file#rewriteheadersheaders-request
      rewriteHeaders: (headers, _request) => {
        // Drop some headers
        const newHeaders = DROP_HEADERS.reduce<IncomingHttpHeaders>(
          (acc, header) => {
            delete acc[header];
            return acc;
          },
          {
            ...headers,
            ...(headers[CACHE_CONTROL_HEADER]
              ? {
                  [CACHE_CONTROL_HEADER]: getCacheControlHeaderValue(CACHE_TTL),
                }
              : undefined),
          }
        );

        return newHeaders;
      },
    },
    preHandler: async (request) => {
      fastify.log.debug(
        { url: request.url, method: request.method },
        `Request coingecko proxy`
      );
    },
    undici: {
      strictContentLength: false, // Prevent errors when content-length header mismatches
    },
  });
};

export default coingeckoProxy;
