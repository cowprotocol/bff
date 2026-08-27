import { FastifyPluginAsync } from 'fastify'
import { registerProxy } from '../../../utils/registerProxy'

const proxy: FastifyPluginAsync = async (fastify): Promise<void> => {
  const upstream = fastify.config.TWAP_BASE_URL
  if (!upstream) {
    fastify.log.warn('TWAP_BASE_URL is not set. Skipping proxy.')
    return
  }

  await registerProxy(fastify, { name: 'twap', upstream })
}

export default proxy
