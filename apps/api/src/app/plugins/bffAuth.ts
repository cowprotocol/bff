import fp from "fastify-plugin";
import { FastifyPluginCallback } from "fastify";

const PROTECTED_PATHS = ['/proxies']

const AUTHORIZED_ORIGINS = (() => {
  const domains = process.env.AUTHORIZED_ORIGINS
  if (!domains) {
    return []
  }

  return domains.split(',').map(domain => domain.trim())
})()


export const bffAuth: FastifyPluginCallback = (fastify, opts, next) => {
  fastify.addHook('onRequest', async (request, reply) => {
    // Return early if its an unprotected path
    if (AUTHORIZED_ORIGINS.length == 0 || !PROTECTED_PATHS.some(path => request.url.startsWith(path))) {
      return
    }

    const origin = request.headers.origin

    // Check the origin
    if (
      // Origin should be present
      !origin ||
      (
        // The origin should be explicitly authorized
        !AUTHORIZED_ORIGINS.some(authorizedOrigin => origin.endsWith(authorizedOrigin)) &&

        // Make an exception for localhost
        !isLocalhost(origin)
      )
    ) {
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
