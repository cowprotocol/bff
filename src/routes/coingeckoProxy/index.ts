import httpProxy from "@fastify/http-proxy";
import { FastifyPluginAsync } from "fastify";

const CACHE_TTL = 1 * 60; // 1 min in s
const SERVER_CACHE_TTL = 1.5 * 60; // 1.5 min in s

const coingeckoProxy: FastifyPluginAsync = async (
  fastify,
  opts
): Promise<void> => {
  fastify.register(httpProxy, {
    upstream: "https://pro-api.coingecko.com",
    rewritePrefix: "/api/v3/",
    replyOptions: {
      rewriteRequestHeaders: (request, headers) => ({
        ...headers,
        "x-cg-pro-api-key": fastify.config.COINGECKO_API_KEY,
      }),
      // Response headers https://github.com/fastify/fastify-reply-from?tab=readme-ov-file#rewriteheadersheaders-request
      rewriteHeaders: (originalHeaders, request) => {
        const {
          // Drop set-cookie header to allow Vercel CDN caching https://vercel.com/docs/edge-network/caching#cacheable-response-criteria
          "set-cookie": _,
          "cache-control": cacheControl,
          ...headers
        } = originalHeaders;

        return {
          ...headers,
          // Only replace `cache-control` if it was set in the response
          ...(cacheControl
            ? {
                "cache-control": `max-age=${CACHE_TTL}, public, s-maxage=${SERVER_CACHE_TTL}`,
                // Add `cdn-cache-control` otherwise Vercel strips `s-maxage` from `cache-control`
                "cdn-cache-control": `max-age=${SERVER_CACHE_TTL}`,
              }
            : undefined),
        };
      },
    },
    undici: {
      strictContentLength: false, // Prevent errors when content-length header mismatches
    },
  });
};

export default coingeckoProxy;
