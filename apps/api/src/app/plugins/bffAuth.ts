import fp from 'fastify-plugin'
import { FastifyPluginCallback } from 'fastify'

const PROTECTED_PATHS = ['/proxies']

const AUTHORIZED_ORIGINS = parseAuthorizedOrigins(process.env.AUTHORIZED_ORIGINS)

export const bffAuth: FastifyPluginCallback = (fastify, opts, next) => {
  fastify.addHook('onRequest', async (request, reply) => {
    // Return early if auth is not configured or its an unprotected path
    if (AUTHORIZED_ORIGINS.length === 0 || !PROTECTED_PATHS.some((path) => request.url.startsWith(path))) {
      return
    }

    const origin = request.headers.origin

    // Check the origin
    if (
      // Origin should be present
      !origin ||
      // The origin should be explicitly authorized
      (!isAuthorizedOrigin(origin) &&
        // Make an exception for localhost
        !isLocalhost(origin))
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

function parseAuthorizedOrigins(domains: string | undefined): string[] {
  if (domains === undefined) {
    return []
  }

  const authorizedOrigins = domains
    .split(',')
    .map((domain) => domain.trim().toLowerCase())
    .filter(Boolean)

  if (authorizedOrigins.length === 0) {
    throw new Error('Malformed AUTHORIZED_ORIGINS: expected at least one hostname')
  }

  return authorizedOrigins
}

function isAuthorizedOrigin(origin: string): boolean {
  const url = parseOrigin(origin)
  if (!url || url.protocol !== 'https:' || url.port) {
    return false
  }

  const hostname = url.hostname.toLowerCase()

  return AUTHORIZED_ORIGINS.some((authorizedOrigin) => isAuthorizedHostname(hostname, authorizedOrigin))
}

function isAuthorizedHostname(hostname: string, authorizedOrigin: string): boolean {
  if (authorizedOrigin.startsWith('.')) {
    return hostname.endsWith(authorizedOrigin) && hostname.length > authorizedOrigin.length
  }

  return hostname === authorizedOrigin
}

function parseOrigin(origin: string): URL | null {
  try {
    return new URL(origin)
  } catch {
    return null
  }
}

export default fp(bffAuth, { fastify: '4.x', name: 'bffAuth' })
