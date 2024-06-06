import httpProxy from "@fastify/http-proxy";
import { FastifyPluginAsync } from "fastify";

const DROP_HEADERS = ['cf-ray', 'cf-cache-status', 'set-cookie', 'server']

const CACHE_TTL = 1 * 60; // 1 min in s
const SERVER_CACHE_TTL = 1.5 * 60; // 1.5 min in s
const DEFAULT_COINGECKO_PROXY_UPSTREAM = "https://api.coingecko.com";

const coingeckoProxy: FastifyPluginAsync = async (
  fastify,
  opts
): Promise<void> => {
  fastify.register(httpProxy, {
    upstream:
      fastify.config.COINGECKO_PROXY_UPSTREAM ||
      DEFAULT_COINGECKO_PROXY_UPSTREAM,
    rewritePrefix: "/api/v3/",
    replyOptions: {
      rewriteRequestHeaders: (request, headers) => ({
        ...headers,
        "x-cg-pro-api-key": fastify.config.COINGECKO_API_KEY,
      }),
      // Response headers https://github.com/fastify/fastify-reply-from?tab=readme-ov-file#rewriteheadersheaders-request
      rewriteHeaders: (headers, request) => {
        // Drop some headers
        const newHeaders = DROP_HEADERS.reduce((acc, header) => {
          delete acc[header];
          return acc;
        }, {
          ...headers,
          ...(headers.cacheControl
            ? {
              "cache-control": `max-age=${CACHE_TTL}, public, s-maxage=${SERVER_CACHE_TTL}`,
            }
            : undefined)
        });

        const logOptions = { url: request.url, method: request.method }
        fastify.log.trace(logOptions, `Old Headers: ${JSON.stringify(headers)}`);
        fastify.log.trace(logOptions, `New Headers: ${JSON.stringify(newHeaders)}`);

        return newHeaders

      },
    },
    preHandler: async (request) => {
      fastify.log.debug({ url: request.url, method: request.method }, `Request coingecko proxy`);
    },
    undici: {
      strictContentLength: false, // Prevent errors when content-length header mismatches
    },
  });
};

export default coingeckoProxy;
