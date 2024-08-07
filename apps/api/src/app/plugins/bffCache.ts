import fp from 'fastify-plugin';
import {
  CACHE_CONTROL_HEADER,
  getCache,
  getCacheControlHeaderValue,
  parseCacheControlHeaderValue,
  setCache,
} from '../../utils/cache';
import {
  FastifyInstance,
  FastifyPluginCallback,
  FastifyReply,
  FastifyRequest,
} from 'fastify';

const HEADER_NAME = 'x-bff-cache';
import { getCacheKey } from '@cowprotocol/repositories';
import { Readable } from 'stream';

interface BffCacheOptions {
  ttl?: number;
}

export const bffCache: FastifyPluginCallback<BffCacheOptions> = (
  fastify,
  opts,
  next
) => {
  const { ttl } = opts;
  fastify.addHook('onRequest', async (request, reply) => {
    // Cache only GET requests
    if (request.method !== 'GET') {
      return;
    }

    let key = getKey(request);

    // Remove it so we can cache it properly
    request.headers['accept-encoding'] = undefined;

    const cacheItem = await getCache(key, fastify).catch((e) => {
      fastify.log.error(`Error getting key ${key} from cache`, e);
      return undefined;
    });

    if (cacheItem) {
      const { item, ttl } = cacheItem;
      fastify.log.debug(`Found cached item "${item}" with TTL`, ttl);

      const ttlInSeconds = isNaN(ttl) ? undefined : Math.floor(ttl / 1000);

      if (ttlInSeconds !== undefined) {
        reply.header(
          CACHE_CONTROL_HEADER,
          getCacheControlHeaderValue(ttlInSeconds)
        );
        reply.header(HEADER_NAME, 'HIT');
        reply.type('application/json');
        reply.send(item);
        fastify.log.debug('onRequest cacheItem: %s (%d)', item, ttlInSeconds);

        return reply;
      }
    } else {
      fastify.log.trace(`Request not cached for "${key}`);
      // For now we don't add the cache 'MISS' header, because we only do this for cacheable endpoints (the ones that include cache-control header in the response)
      // We need to handle this in the "onSend" once we know the actual response
    }
  });

  fastify.addHook('onSend', async function (req, reply, payload) {
    try {
      const isCacheHit = reply.getHeader(HEADER_NAME) === 'HIT';
      const cacheTtl: number | undefined = getTtlFromResponse(reply, ttl);
      const isStatus200 = reply.statusCode >= 200 && reply.statusCode < 300;

      // If the cache is a hit, or is non-cacheable, we just proceed with the request
      if (isCacheHit || cacheTtl === undefined || !isStatus200) {
        return undefined;
      }

      // If there is no cached data, then its a cache-miss
      reply.header(HEADER_NAME, 'MISS');

      // Get content from payload
      const content =
        typeof payload === 'string'
          ? payload
          : await getContentFromPayload(payload);

      if (content !== null) {
        // Cache (fire and forget)
        const key = getKey(req);
        setCache(key, content, cacheTtl, fastify).catch((e) => {
          fastify.log.error(`Error setting key ${key} to cache`, e);
        });
        reply.header(
          CACHE_CONTROL_HEADER,
          getCacheControlHeaderValue(cacheTtl)
        );
        return content;
      }
    } catch (error) {
      console.error('[bffCache] Error handling the cache', error);
    }
  });

  next();
};

async function getContentFromPayload(payload: unknown): Promise<string | null> {
  if (payload instanceof Buffer) {
    return payload.toString();
  }

  if (payload instanceof Response) {
    return payload.text();
  }

  let contents = '';
  if (payload instanceof Readable) {
    for await (const chunk of payload) {
      contents += chunk.toString();
    }
  } else if (payload instanceof ReadableStream) {
    const reader = payload.getReader();
    let result;
    while (!(result = await reader.read()).done) {
      contents += new TextDecoder().decode(result.value);
    }
  } else {
    return null;
  }

  return contents;
}

function getKey(req: FastifyRequest) {
  return getCacheKey('requests', ...req.url.split('/'));
}

function getTtlFromResponse(
  reply: FastifyReply,
  defaultTtl: number | undefined
): number | undefined {
  const cacheControl = parseCacheControlHeaderValue(
    reply.getHeader(CACHE_CONTROL_HEADER)
  );
  const maxAge = cacheControl['max-age'];
  return maxAge ? parseInt(maxAge) : defaultTtl;
}

export default fp<BffCacheOptions>(bffCache, {
  fastify: '4.x',
  name: 'bffCache',
});
