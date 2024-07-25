import fp from "fastify-plugin";
import { CACHE_CONTROL_HEADER, getCache, getCacheControlHeaderValue, parseCacheControlHeaderValue, setCache } from "../../utils/cache";
import { FastifyPluginCallback, FastifyReply, FastifyRequest } from "fastify";

const HEADER_NAME = 'x-bff-cache'
import { ReadableStream } from 'stream/web';

interface BffCacheOptions {
  ttl?: number
}

export const bffCache: FastifyPluginCallback<BffCacheOptions> = (fastify, opts, next) => {
  const { ttl } = opts
  fastify.addHook('onRequest', async (request, reply) => {
    // Cache only GET requests
    if (request.method !== 'GET') {
      return
    }

    const key = getKey(request);
    // Remove it so we can cache it properly
    request.headers['accept-encoding'] = undefined;

    const cacheItem = await getCache(key, fastify).catch(e => {
      fastify.log.error(`Error getting key ${key} from cache`, e)
      return null
    })

    if (cacheItem) {
      const { item, ttl } = cacheItem
      const ttlInSeconds = isNaN(ttl) ? undefined : Math.floor(ttl / 1000)

      if (ttlInSeconds !== undefined) {
        reply.header(CACHE_CONTROL_HEADER, getCacheControlHeaderValue(ttlInSeconds))
        reply.header(HEADER_NAME, 'HIT')
        reply.type('application/json')
        reply.send(item)
        return;
      }
    }

    return
  })

  fastify.addHook('onSend', async function (req, reply, payload) {
    const isCacheHit = reply.getHeader(HEADER_NAME) === 'HIT';
    const cacheTtl: number | undefined = getTtlFromResponse(reply, ttl);
    const isStatus200 = reply.statusCode >= 200 && reply.statusCode < 300;

    // If the cache is a hit, or is non-cacheable, we just proceed with the request
    if (isCacheHit || cacheTtl === undefined || !isStatus200) {
      return;
    }

    // If there is no cached data, then its a cache-miss

    let contents = '';
    for await (const chunk of payload as ReadableStream) {
      contents += chunk.toString(); // Process each chunk of data
    }

    const key = getKey(req);
    setCache(key, contents, cacheTtl, fastify).catch((e) => {
      fastify.log.error(`Error setting key ${key} from cache`, e);
      return null;
    });
    reply.header(CACHE_CONTROL_HEADER, getCacheControlHeaderValue(cacheTtl));

    return contents;
  });

  next();
};

function getKey(req: FastifyRequest) {
  return `GET:${req.url}`;
}

function getTtlFromResponse(reply: FastifyReply, defaultTtl: number | undefined): number | undefined {
  const cacheControl = parseCacheControlHeaderValue(reply.getHeader(CACHE_CONTROL_HEADER))
  const maxAge = cacheControl["max-age"]
  return maxAge ? parseInt(maxAge) : defaultTtl
}

export default fp<BffCacheOptions>(bffCache, { fastify: '4.x', name: 'bffCache' })
