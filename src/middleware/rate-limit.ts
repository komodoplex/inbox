import type { MiddlewareHandler } from 'hono'
import { checkRateLimit } from '@/services/rate-limit.service'
import { HTTP_HEADERS } from '@/constants/http'
import type { AppEnvironment } from '@/types/env'

const DEFAULT_IP = 'unknown-ip'

/**
 * Extract trusted client IP, preventing spoofing of X-Forwarded-For in production
 */
const extractClientIp = (
  cfConnectingIp?: string,
  xForwardedFor?: string,
  isDevOrTest: boolean = false
): string => {
  if (cfConnectingIp) {
    return cfConnectingIp.trim()
  }
  if (isDevOrTest && xForwardedFor) {
    return xForwardedFor.split(',')[0]?.trim() || DEFAULT_IP
  }
  return DEFAULT_IP
}

/**
 * Rate limiting middleware for public message intake
 */
const publicRateLimitMiddleware = (): MiddlewareHandler<AppEnvironment> => {
  return async (c, next) => {
    const isDevOrTest =
      c.env.ENVIRONMENT === 'development' || c.env.ENVIRONMENT === 'test'
    const clientIp = extractClientIp(
      c.req.header(HTTP_HEADERS.CF_CONNECTING_IP),
      c.req.header(HTTP_HEADERS.X_FORWARDED_FOR),
      isDevOrTest
    )

    const logicalKey = `ratelimit:public:${clientIp}`
    await checkRateLimit(c.env, logicalKey)

    await next()
  }
}

export { extractClientIp, publicRateLimitMiddleware }


