import Ajv from 'ajv'
import { FastifyPluginAsync } from 'fastify'
import { FromSchema } from 'json-schema-to-ts'
import { CACHE_CONTROL_HEADER, getCacheControlHeaderValue } from '../../../../../../utils/cache'
import { supplyErrorSchema, supplyParamsSchema, supplyResponseSchema } from './supply.schemas'

const TOKEN_SUPPLY_URL = 'https://files.cow.fi/token-lists/TokenSupply'
const CACHE_SECONDS = 3600

type SupplyParams = FromSchema<typeof supplyParamsSchema>
type SupplyResponse = FromSchema<typeof supplyResponseSchema>
type SupplyError = FromSchema<typeof supplyErrorSchema>

const validateSupply = new Ajv().compile<SupplyResponse>(supplyResponseSchema)

const supply: FastifyPluginAsync = async (fastify): Promise<void> => {
  const cache = new Map<number, { expiresAt: number; tokens: Record<string, unknown> }>()

  async function getSupplies(chainId: number): Promise<Record<string, unknown>> {
    const cached = cache.get(chainId)
    if (cached && cached.expiresAt > Date.now()) return cached.tokens

    const response = await globalThis.fetch(`${TOKEN_SUPPLY_URL}.${chainId}.json`, {
      signal: AbortSignal.timeout(5000),
    })
    if (!response.ok) throw new Error()

    const { tokens } = (await response.json()) as { tokens?: Record<string, unknown> }
    if (!tokens) throw new Error()

    cache.set(chainId, { expiresAt: Date.now() + CACHE_SECONDS * 1000, tokens })
    return tokens
  }

  fastify.get<{
    Params: SupplyParams
    Reply: SupplyResponse | SupplyError
  }>(
    '/',
    {
      schema: {
        params: supplyParamsSchema,
        response: {
          200: supplyResponseSchema,
          404: supplyErrorSchema,
          502: supplyErrorSchema,
        },
      },
    },
    async (request, reply) => {
      try {
        const supplies = await getSupplies(request.params.chainId)
        const tokenSupply = supplies[request.params.tokenAddress.toLowerCase()]

        if (tokenSupply === undefined) {
          return reply.code(404).send({ message: 'Token supply not found' })
        }
        if (!validateSupply(tokenSupply)) throw new Error()

        reply.header(CACHE_CONTROL_HEADER, getCacheControlHeaderValue(CACHE_SECONDS))
        return reply.send(tokenSupply as SupplyResponse)
      } catch {
        return reply.code(502).send({ message: 'Token supply unavailable' })
      }
    }
  )
}

export default supply
