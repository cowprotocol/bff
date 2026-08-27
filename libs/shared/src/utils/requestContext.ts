import { AsyncLocalStorage } from 'async_hooks'

export interface RequestContext {
  /** Fastify's per-request id, so a log line can be joined to the request that produced it */
  reqId: string
}

/**
 * Carries the current request's identity to code that has no access to the request.
 *
 * Repositories and services log through the module-level logger, which knows nothing about Fastify.
 * That left their lines — including the price fallback ones — impossible to attribute to a request,
 * so answering "what else happened while this call was being served" meant guessing from timestamps.
 *
 * Threading a logger through every repository signature would have touched every implementation and
 * every test. This does it without changing a single call site: the plugin populates the store, and
 * the logger's pino `mixin` reads it.
 */
export const requestContext = new AsyncLocalStorage<RequestContext>()

/** Current request context, or undefined outside a request (workers, producers, startup). */
export function getRequestContext(): RequestContext | undefined {
  return requestContext.getStore()
}
