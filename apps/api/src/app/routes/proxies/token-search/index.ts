import Ajv from 'ajv'
import { FastifyPluginAsync } from 'fastify'
import { FromSchema } from 'json-schema-to-ts'
import type {} from '../../../plugins/env'
import { deploymentSchema, searchBodySchema, upstreamResponseSchema } from './tokens.schemas'

type SearchBody = FromSchema<typeof searchBodySchema>
type UpstreamResponse = FromSchema<typeof upstreamResponseSchema>

const ajv = new Ajv()
const validateResponse = ajv.compile<UpstreamResponse>(upstreamResponseSchema)
const validateDeployment = ajv.compile<FromSchema<typeof deploymentSchema>>(deploymentSchema)

const tokens: FastifyPluginAsync = async (fastify): Promise<void> => {
  const searchUrl = fastify.config.TOKEN_SEARCH_URL
  if (!searchUrl) {
    fastify.log.warn('TOKEN_SEARCH_URL is not set. Skipping token search.')
    return
  }

  fastify.post<{ Body: SearchBody }>('/', { schema: { body: searchBodySchema } }, async (request, reply) => {
    const { searchQuery, chainId } = request.body
    const started = Date.now()

    try {
      const response = await globalThis.fetch(searchUrl, {
        method: 'POST',
        headers: { 'content-type': 'application/json', 'connect-protocol-version': '1' },
        body: JSON.stringify({
          searchQuery,
          chainIds: [chainId],
          types: ['SEARCH_TYPE_TOKEN'],
          maxResults: 15,
        }),
        signal: AbortSignal.timeout(10_000),
      })

      fastify.log.info({ upstream: 'token-search', status: response.status, ms: Date.now() - started }, 'Token search')
      if (!response.ok) throw new Error('Token search failed.')

      const result: unknown = await response.json()
      if (!validateResponse(result)) throw new Error('The token search response is invalid.')

      reply.header('cache-control', 'no-store')
      const { tokens = [] } = result
      return tokens.flatMap(({ multichainToken: { deployments, name, symbol, project } }) => {
        const deployment = deployments[chainId]
        if (deployment === undefined) return []
        if (!validateDeployment(deployment)) throw new Error('The token search response is invalid.')

        const { address, decimals = 0 } = deployment
        return [{ chainId, address, decimals, name, symbol, logoURI: project?.logoUrl }]
      })
    } catch {
      fastify.log.warn({ upstream: 'token-search', ms: Date.now() - started }, 'Token search failed.')
      return reply.code(502).send({ message: 'Token search failed. Try again later.' })
    }
  })
}

export default tokens
