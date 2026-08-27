import { FastifyPluginAsync } from 'fastify'
import { registerProxy } from '../../../../utils/registerProxy'

const proxy: FastifyPluginAsync = async (fastify): Promise<void> => {
  const upstream = fastify.config.PROXY_UPSTREAM
  if (!upstream) {
    fastify.log.warn('PROXY_UPSTREAM is not set. Skipping proxy.')
    return
  }

  await registerProxy(fastify, {
    name: 'tokens',
    upstream,
    replyOptions: {
      rewriteRequestHeaders: (originalRequest, headers) => ({
        ...headers,
        Origin: fastify.config.PROXY_ORIGIN,
        Host: fastify.config.PROXY_HOST,
      }),
    },
  })
}

export default proxy
