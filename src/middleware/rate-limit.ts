import type { MiddlewareHandler } from 'hono'
import { checkRateLimit } from '@/services/rate-limit.service'
import { HTTP_HEADERS } from '@/constants/http'
import type { AppEnvironment } from '@/types/env'

const DEFAULT_IP = 'unknown-ip'
const IP_SAFE_REGEX = /^[a-fA-F0-9:.]+$/

/**
 * Extract trusted client IP, preventing spoofing of X-Forwarded-For in production
 */
const extractClientIp = (
  cfConnectingIp?: string,
  xForwardedFor?: string,
  isDevOrTest: boolean = false
): string => {
  if (cfConnectingIp) {
    const trimmed = cfConnectingIp.trim()
    if (trimmed.length > 0 && trimmed.length <= 45 && IP_SAFE_REGEX.test(trimmed)) {
      return trimmed
    }
  }
  if (isDevOrTest && xForwardedFor) {
    const firstIp = xForwardedFor.split(',')[0]?.trim() || ''
    if (firstIp.length > 0 && firstIp.length <= 45 && IP_SAFE_REGEX.test(firstIp)) {
      return firstIp
    }
  }
  return DEFAULT_IP
}

/**
 * Rate limiting middleware for public message intake
 */
const publicRateLimitMiddleware = (): MiddlewareHandler<AppEnvironment> => {
  return async (c, next) => {
    const isDevOrTest = c.env.ENVIRONMENT !== 'production'
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


