import fp from 'fastify-plugin'
import { FastifyPluginCallback } from 'fastify'

const PROTECTED_PATHS = ['/proxies']
const VERCEL_ORIGIN_PATTERN = /^vercel:([a-z0-9-]+):([a-z0-9-]+):([a-z0-9-]+)$/

const AUTHORIZED_ORIGINS = parseAuthorizedOrigins(process.env.AUTHORIZED_ORIGINS)

export const bffAuth: FastifyPluginCallback = (fastify, opts, next) => {
  fastify.addHook('onRequest', async (request, reply) => {
    // Return early if auth is not configured or it's an unprotected path
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
    if (process.env.NODE_ENV === 'production') {
      throw new Error('Missing AUTHORIZED_ORIGINS in production')
    }
    return []
  }

  const authorizedOrigins = domains
    .split(',')
    .map((domain) => domain.trim().toLowerCase())
    .filter(Boolean)

  if (authorizedOrigins.length === 0) {
    throw new Error('Malformed AUTHORIZED_ORIGINS: expected at least one hostname')
  }

  if (authorizedOrigins.some((origin) => origin.startsWith('vercel:') && !parseVercelEntry(origin))) {
    throw new Error('Malformed AUTHORIZED_ORIGINS: invalid Vercel entry')
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
  const vercelEntry = parseVercelEntry(authorizedOrigin)
  if (vercelEntry) {
    return isAuthorizedVercelHostname(hostname, vercelEntry.branchProject, vercelEntry.scope, vercelEntry.buildProject)
  }

  if (authorizedOrigin.startsWith('.')) {
    return hostname.endsWith(authorizedOrigin) && hostname.length > authorizedOrigin.length
  }

  return hostname === authorizedOrigin
}

function isAuthorizedVercelHostname(
  hostname: string,
  branchProject: string,
  scope: string,
  buildProject: string
): boolean {
  const vercelSuffix = '.vercel.app'
  if (!hostname.endsWith(vercelSuffix)) {
    // Only Vercel preview hosts use this suffix
    return false
  }

  const deployment = hostname.slice(0, -vercelSuffix.length)
  const branchPrefix = `${branchProject}-git-`
  const buildPrefix = `${buildProject}-`
  const suffix = `-${scope}`
  const hasFullSuffix = deployment.endsWith(suffix)
  const maxDeploymentLabelLength = 63

  if (
    // It shouldn't have additional subdomains
    deployment.includes('.') ||
    // It shouldn't exceed the DNS label limit
    deployment.length > maxDeploymentLabelLength ||
    // Missing full suffix is only valid when Vercel hit the DNS label limit
    (!hasFullSuffix && deployment.length !== maxDeploymentLabelLength)
  ) {
    return false
  }

  if (deployment.startsWith(branchPrefix)) {
    // Truncated branch labels cannot prove the suffix is not part of the branch name
    return hasFullSuffix && deployment.length > branchPrefix.length + suffix.length
  }

  if (!deployment.startsWith(buildPrefix)) {
    // Anything else is not a configured build preview
    return false
  }

  const buildPart = hasFullSuffix
    ? deployment.slice(buildPrefix.length, -suffix.length)
    : deployment.slice(buildPrefix.length)

  if (hasFullSuffix) {
    // Full labels keep the original strict build-id check
    return /^[a-z0-9]+$/.test(buildPart)
  }

  const buildId = buildPart.split('-', 1)[0]
  const suffixFragment = buildPart.slice(buildId.length)

  // Truncated build labels may keep only the start of "-scope"
  return /^[a-z0-9]+$/.test(buildId) && suffixFragment.length > 1 && suffix.startsWith(suffixFragment)
}

function parseVercelEntry(entry: string): { branchProject: string; scope: string; buildProject: string } | null {
  const match = VERCEL_ORIGIN_PATTERN.exec(entry)
  if (!match) {
    return null
  }

  return { branchProject: match[1], scope: match[2], buildProject: match[3] }
}

function parseOrigin(origin: string): URL | null {
  try {
    return new URL(origin)
  } catch {
    return null
  }
}

export default fp(bffAuth, { fastify: '4.x', name: 'bffAuth' })
