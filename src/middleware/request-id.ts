import type { MiddlewareHandler } from 'hono'
import { HTTP_HEADERS } from '@/constants/http'
import type { AppEnvironment } from '@/types/env'

const CF_RAY_HEADER = 'cf-ray'

/**
 * Middleware to generate or forward X-Request-ID on all incoming requests
 */
const requestIdMiddleware = (): MiddlewareHandler<AppEnvironment> => {
  return async (c, next) => {
    const headerId =
      c.req.header(HTTP_HEADERS.X_REQUEST_ID) || c.req.header(CF_RAY_HEADER)
    const requestId = headerId || crypto.randomUUID()

    c.set('requestId', requestId)
    await next()
    c.res.headers.set(HTTP_HEADERS.X_REQUEST_ID, requestId)
    c.res.headers.set('X-Content-Type-Options', 'nosniff')
    c.res.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin')
    c.res.headers.set('X-Frame-Options', 'DENY')
  }
}

export { requestIdMiddleware }

