import fastifyCaching from "@fastify/caching";
import httpProxy from "@fastify/http-proxy";
import { FastifyPluginAsync } from "fastify";
import { ReadableStream } from "stream/web";

const CACHE_TTL = 1 * 60; // 1 min in s
const SERVER_CACHE_TTL = 1.5 * 60; // 1.5 min in s

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
  fastify.register(fastifyCaching, {
    expiresIn: CACHE_TTL,
    serverExpiresIn: SERVER_CACHE_TTL,
  });

  // Intercepts request and uses cache if found
  fastify.addHook("onRequest", async function (req, reply) {
    fastify.cache.get(req.url.toLowerCase(), (err, result) => {
      if (err) {
        fastify.log.warn(`Error fetching cache for '${req.url}'`, err);
        return err;
      }
      if (isCachedResponse(result)) {
        fastify.log.info(`onRequest: cache hit for ${req.url}`);
        reply
          .headers({
            ...result.item.headers,
            "x-proxy-cache": "HIT",
          })
          .send(result.item.contents);
      }
    });
  });

  // Intercepts response to store result on cache
  fastify.addHook("onSend", async function (req, reply, payload) {
    // Apply our own cache control header, but only if set in the response already
    if (reply.getHeader("cache-control")) {
      reply.header(
        "cache-control",
        `max-age=${CACHE_TTL}, public, s-maxage=${SERVER_CACHE_TTL}`
      );
    }

    if (
      reply.getHeader("x-proxy-cache") !== "HIT" &&
      reply.statusCode >= 200 &&
      reply.statusCode < 300
    ) {
      fastify.log.info(`onSend: caching response for ${req.url}`);

      // Set header indicating the internal cache miss
      reply.header("x-proxy-cache", "MISS");

      // No cache hit, consume the payload stream to be able to cache it
      let contents = "";
      for await (const chunk of payload as ReadableStream) {
        contents += chunk.toString(); // Process each chunk of data
      }

      const headers = reply.getHeaders();
      // Do not cache `set-cookie` header
      delete headers["set-cookie"];

      // Cache contents and headers
      fastify.cache.set(
        req.url.toLowerCase(),
        { contents, headers },
        CACHE_TTL * 1000, // in milliseconds
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
