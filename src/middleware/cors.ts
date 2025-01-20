import type { MiddlewareHandler } from 'hono'
import { assertAllowedOrigin } from '@/checks'
import { ALLOWED_ORIGIN_DOMAINS } from '@/constants/sources'
import { HTTP_HEADERS } from '@/constants/http'
import type { AppEnvironment } from '@/types/env'

const ALLOWED_DOMAINS_LIST: readonly string[] = [
  ALLOWED_ORIGIN_DOMAINS.KOMODOPLEX,
  ALLOWED_ORIGIN_DOMAINS.REPUTASK,
  ALLOWED_ORIGIN_DOMAINS.REPUTASK_APP,
]

/**
 * Check whether a hostname is exactly the domain or a proper subdomain
 */
const isDomainOrSubdomain = (hostname: string, domain: string): boolean => {
  if (hostname === domain) {
    return true
  }
  if (hostname.endsWith(`.${domain}`)) {
    const sub = hostname.slice(0, -(domain.length + 1))
    return sub.length > 0 && !sub.startsWith('.') && !sub.endsWith('.')
  }
  return false
}

/**
 * Validate whether an Origin header matches allowed venture domains
 */
const isOriginAllowed = (
  origin: string | undefined,
  allowedDomains: readonly string[] = ALLOWED_DOMAINS_LIST,
  isDev: boolean = false
): boolean => {
  if (!origin || origin === 'null' || !origin.trim()) {
    return false
  }

  try {
    const url = new URL(origin)
    const protocol = url.protocol.toLowerCase()

    if (isDev) {
      if (protocol !== 'http:' && protocol !== 'https:') {
        return false
      }
      const hostname = url.hostname.toLowerCase().replace(/\.+$/, '')
      if (hostname === 'localhost' || hostname === '127.0.0.1') {
        return true
      }
    } else {
      if (protocol !== 'https:') {
        return false
      }
      if (url.port && url.port !== '443') {
        return false
      }
    }

    const hostname = url.hostname.toLowerCase().replace(/\.+$/, '')
    if (!hostname || hostname.startsWith('.')) {
      return false
    }

    return allowedDomains.some((domain) => isDomainOrSubdomain(hostname, domain))
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
      const isDev = c.env.ENVIRONMENT !== 'production'
      const allowed = isOriginAllowed(origin, ALLOWED_DOMAINS_LIST, isDev)
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

export { isDomainOrSubdomain, isOriginAllowed, publicCorsMiddleware }

