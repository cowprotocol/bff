import { requestContext } from '@cowprotocol/shared'
import { FastifyPluginCallback } from 'fastify'
import fp from 'fastify-plugin'

/**
 * Makes Fastify's request id visible to everything the request touches.
 *
 * Fastify binds a per-request child logger, but repositories and services log through the shared
 * module-level logger and never see it. Running the rest of the request inside an AsyncLocalStorage
 * scope lets the logger's `mixin` pick the id up, so every line from a request carries it without
 * any call site changing.
 */
export const requestContextPlugin: FastifyPluginCallback = (fastify, opts, next) => {
  fastify.addHook('onRequest', (request, _reply, done) => {
    requestContext.run({ reqId: request.id }, done)
  })

  next()
}

export default fp(requestContextPlugin, { fastify: '4.x', name: 'requestContext' })
