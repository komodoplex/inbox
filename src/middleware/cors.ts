import type { MiddlewareHandler } from 'hono'
import { assertAllowedOrigin } from '@/checks'
import { ALLOWED_ORIGIN_DOMAINS } from '@/constants/sources'
import { HTTP_HEADERS } from '@/constants/http'
import type { AppEnvironment } from '@/types/env'

const ALLOWED_DOMAINS_LIST: readonly string[] = [
  ALLOWED_ORIGIN_DOMAINS.KOMODOPLEX,
  ALLOWED_ORIGIN_DOMAINS.REPUTASK,
]

/**
 * Validate whether an Origin header matches allowed venture domains
 */
const isOriginAllowed = (origin: string, isDev: boolean = false): boolean => {
  try {
    const url = new URL(origin)
    const hostname = url.hostname.toLowerCase()

    if (isDev && (hostname === 'localhost' || hostname === '127.0.0.1')) {
      return true
    }

    return ALLOWED_DOMAINS_LIST.some(
      (domain) => hostname === domain || hostname.endsWith(`.${domain}`)
    )
  } catch {
    return false
  }
}

/**
 * Clean CORS middleware for public message ingestion
 */
const publicCorsMiddleware = (): MiddlewareHandler<AppEnvironment> => {
  return async (c, next) => {
    const origin = c.req.header(HTTP_HEADERS.ORIGIN)

    if (origin) {
      const isDev =
        c.env.ENVIRONMENT === 'development' || c.env.ENVIRONMENT === 'test'
      const allowed = isOriginAllowed(origin, isDev)
      assertAllowedOrigin(allowed)

      c.res.headers.set(HTTP_HEADERS.ACCESS_CONTROL_ALLOW_ORIGIN, origin)
      c.res.headers.set('Vary', 'Origin')
      c.res.headers.set(HTTP_HEADERS.ACCESS_CONTROL_ALLOW_METHODS, 'POST, OPTIONS')
      c.res.headers.set(
        HTTP_HEADERS.ACCESS_CONTROL_ALLOW_HEADERS,
        'Content-Type, X-Request-ID'
      )
      c.res.headers.set(HTTP_HEADERS.ACCESS_CONTROL_MAX_AGE, '86400')
    }

    if (c.req.method === 'OPTIONS') {
      return c.body(null, 204)
    }

    await next()
  }
}

export { isOriginAllowed, publicCorsMiddleware }

