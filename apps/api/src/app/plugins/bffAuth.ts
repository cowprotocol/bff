import fp from "fastify-plugin";
import { CACHE_CONTROL_HEADER, getCache, getCacheControlHeaderValue, parseCacheControlHeaderValue, setCache } from "../../utils/cache";
import { FastifyPluginCallback, FastifyReply, FastifyRequest } from "fastify";

const PROTECTED_PATHS = ['/proxies']

const AUTHORIZED_DOMAINS = (() => {
  const domains = process.env.AUTHORIZED_DOMAINS
  if (!domains) {
    return undefined
  }

  return domains.split(',').map(domain => domain.trim())
})()

interface BffCacheOptions {
  ttl?: number
}

export const bffCache: FastifyPluginCallback<BffCacheOptions> = (fastify, opts, next) => {
  const { ttl } = opts
  fastify.addHook('onRequest', async (request, reply) => {
    // Cache only GET requests
    if (!AUTHORIZED_DOMAINS) {
      return
    }

    // Check the path is withing the protected paths
    if (!PROTECTED_PATHS.some(path => request.url.startsWith(path))) {

      // Verify the origin is authorized
      const origin = request.headers.origin
      if (!origin || !AUTHORIZED_DOMAINS.includes(origin)) {
        reply.status(403).send('Unauthorized')
        return
      }
    }

    return
  })

  next()
}



export default fp<BffCacheOptions>(bffCache, { fastify: '4.x', name: 'bffAuth' })
