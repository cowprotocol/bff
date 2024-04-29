import fastifyCaching from "@fastify/caching";
import httpProxy from "@fastify/http-proxy";
import { FastifyPluginAsync } from "fastify";
import { ReadableStream } from "stream/web";

const CACHE_TTL = 5 * 60 * 1000; // 5 min in ms

type CachedData = {
  item: {
    contents: string;
    headers: Headers;
  };
};

function isCachedResponse(cached: any): cached is CachedData {
  return (
    cached &&
    typeof cached === "object" &&
    "item" in cached &&
    typeof cached.item === "object" &&
    "contents" in cached.item
  );
}

const coingeckoProxy: FastifyPluginAsync = async (
  fastify,
  opts
): Promise<void> => {
  // Set up caching
  fastify.register(fastifyCaching, { expiresIn: 300, serverExpiresIn: 300 });

  // Intercepts request and uses cache if found
  fastify.addHook("onRequest", async function (req, reply) {
    fastify.log.info("onRequest handler triggered");
    fastify.cache.get(req.url.toLowerCase(), (err, result) => {
      if (err) {
        fastify.log.warn(`Error fetching cache for '${req.url}'`, err);
        return err;
      }
      if (isCachedResponse(result)) {
        fastify.log.info("cache hit!!");
        reply
          .headers({ "cache-hit": true, ...result.item.headers })
          .send(result.item.contents);
      }
    });
  });

  // Intercepts response to store result on cache
  fastify.addHook("onSend", async function (req, reply, payload) {
    if (reply.getHeader("cache-hit")) {
      // Header set when there's a cache hit, remove it
      reply.removeHeader("cache-hit");
      fastify.log.info("cache hit, not storing it");
    } else if (reply.statusCode >= 200 && reply.statusCode < 300) {
      // No cache hit, consume the payload stream to be able to cache it
      fastify.log.info("not cached, storing it");
      let contents = "";
      for await (const chunk of payload as ReadableStream) {
        contents += chunk.toString(); // Process each chunk of data
      }

      // Cache contents and headers
      fastify.cache.set(
        req.url.toLowerCase(),
        { contents, headers: reply.getHeaders() },
        CACHE_TTL,
        (error) => {
          if (error)
            fastify.log.error(`Failed to cache result for ${req.url}`, error);
        }
      );

      // Return consumed payload
      // This is important!!! Without this, the response will be empty
      return contents;
    }
  });

  fastify.register(httpProxy, {
    upstream: "https://api.coingecko.com",
    rewritePrefix: "/api/v3/simple/",
    replyOptions: {
      rewriteRequestHeaders: (originalRequest: any, headers: any) => {
        return {
          ...headers,
          Origin: "https://swap.cow.fi",
        };
      },
    },
  });
};

export default coingeckoProxy;
