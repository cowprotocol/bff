import fp from "fastify-plugin";
import { getCache, setCache } from "../../utils";
import { FastifyPluginCallback, FastifyRequest } from "fastify";

const DEFAULT_CACHE_TTL = 120
const HEADER_NAME = 'x-bff-cache'


interface MyPluginOptions {
  ttl?: number
}

export const bffCache: FastifyPluginCallback<MyPluginOptions> = (fastify, opts, next) => {
  const { ttl = DEFAULT_CACHE_TTL } = opts
  fastify.addHook('onRequest', async (request, reply) => {
    // Cache only GET requests
    if (request.method !== 'GET') {
      return
    }
    // if (reply.getHeader('x-cache-bypass') === 'true') {
    //     return done();
    // }

    let key = getKey(request)

    const cacheItem = await getCache(key, fastify).catch(e => {
      console.error('Error getting key', key, e)
      fastify.log.error(`Error getting key ${key} from cache`, e)
      return null
    })
    console.log('Get value', key, cacheItem)

    if (cacheItem) {
      const { item, ttl } = cacheItem
      const ttlInSeconds = Math.floor(ttl / 1000)

      if (ttlInSeconds) {
        reply.header("cache-control", `max-age=${ttlInSeconds}, public, s-maxage=${ttlInSeconds}`)
      }
      reply.header(HEADER_NAME, 'HIT')
      reply.type('application/json')
      reply.send(item)
      return;
    }

    // If there is no cached data, then we just proceed with the request
    reply.header(HEADER_NAME, 'MISS')
    return
  })

  fastify.addHook('onSend', function (req, reply, payload, next) {
    if (reply.getHeader(HEADER_NAME) === 'HIT') {
      next();
      return;
    }

    let key = getKey(req)
    console.log('Caching value', key, payload)
    setCache(key, payload, ttl, fastify).catch(e => {
      console.error('Error getting key', key, e)
      fastify.log.error(`Error setting key ${key} from cache`, e)
      return null
    })
    reply.header("cache-control", getCacheControlHeader(ttl))
    next()
  })

  next()
}

function getCacheControlHeader(ttl: number) {
  return `max-age=${ttl}, public, s-maxage=${ttl}`

}


function getKey(req: FastifyRequest) {
  return `GET:${req.routerPath}`;
}


export default fp(bffCache)