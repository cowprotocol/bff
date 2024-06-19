import fp from "fastify-plugin";
import { FastifyPluginCallback } from "fastify";

const PROTECTED_PATHS = ['/proxies']

const AUTHORIZED_DOMAINS = (() => {
  const domains = process.env.AUTHORIZED_DOMAINS
  if (!domains) {
    return undefined
  }

  return domains.split(',').map(domain => domain.trim())
})()


export const bffAuth: FastifyPluginCallback = (fastify, opts, next) => {
  fastify.addHook('onRequest', async (request, reply) => {
    // Return early if its an unprotected path
    if (AUTHORIZED_DOMAINS.length == 0 || !PROTECTED_PATHS.some(path => request.url.startsWith(path))) {
      return
    }

    const origin = request.headers.origin
    // Check the path is withing the protected paths (or its localhost)
    if ((!origin || !AUTHORIZED_DOMAINS.includes(origin)) && !isLocalhost(origin)) {
      reply.status(403).send('Unauthorized')
      return
    }

    return
  })

  next()
}

function isLocalhost(origin: string): boolean {
  if (!origin) {
    return false
  }
  return /^http:\/\/localhost:\d+\/?$/.test(origin)
}

export default fp(bffAuth, { fastify: '4.x', name: 'bffAuth' })
