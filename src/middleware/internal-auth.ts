import type { MiddlewareHandler } from 'hono'
import { assertInternalAuth } from '@/checks'
import { HTTP_HEADERS } from '@/constants/http'
import { verifyAccessJwt } from '@/services/cf-access.service'
import type { AppEnvironment } from '@/types/env'

const CF_ACCESS_EMAIL_HEADER = 'cf-access-authenticated-user-email'
const CF_ACCESS_JWT_HEADER = 'cf-access-jwt-assertion'
const X_API_KEY_HEADER = 'x-api-key'
const BEARER_PREFIX_REGEX = /^Bearer\s+/i
const API_KEY_USER_IDENTIFIER = 'api-key-user'

/**
 * Constant-time comparison using fixed-length SHA-256 digests to prevent timing and length attacks
 */
const timingSafeEqual = async (a: string, b: string): Promise<boolean> => {
  const enc = new TextEncoder()
  const aHash = await crypto.subtle.digest('SHA-256', enc.encode(a))
  const bHash = await crypto.subtle.digest('SHA-256', enc.encode(b))

  if (
    typeof (crypto.subtle as { timingSafeEqual?: unknown }).timingSafeEqual ===
    'function'
  ) {
    return (
      crypto.subtle as unknown as {
        timingSafeEqual: (x: ArrayBuffer, y: ArrayBuffer) => boolean
      }
    ).timingSafeEqual(aHash, bHash)
  }

  const aBuf = new Uint8Array(aHash)
  const bBuf = new Uint8Array(bHash)
  let diff = 0
  for (let i = 0; i < 32; i++) {
    diff |= aBuf[i] ^ bBuf[i]
  }
  return diff === 0 && a === b
}

/**
 * Internal authentication middleware supporting verified Cloudflare Access JWT and API key
 */
const internalAuthMiddleware = (): MiddlewareHandler<AppEnvironment> => {
  return async (c, next) => {
    const accessJwt = c.req.header(CF_ACCESS_JWT_HEADER)
    const accessEmailHeader = c.req.header(CF_ACCESS_EMAIL_HEADER)
    const apiKey =
      c.req.header(X_API_KEY_HEADER) ||
      c.req.header(HTTP_HEADERS.AUTHORIZATION)?.replace(BEARER_PREFIX_REGEX, '')
    const expectedApiKey = c.env.INTERNAL_API_KEY

    // 1. Check API Key with constant-time comparison
    let isApiKeyValid = false
    if (expectedApiKey && apiKey) {
      isApiKeyValid = await timingSafeEqual(apiKey, expectedApiKey)
    }

    // 2. Cryptographically verify Cloudflare Access JWT
    let verifiedAccessEmail: string | null = null
    if (accessJwt) {
      const verified = await verifyAccessJwt(accessJwt, c.env)
      if (verified) {
        if (
          !accessEmailHeader ||
          accessEmailHeader.toLowerCase() === verified.email.toLowerCase()
        ) {
          verifiedAccessEmail = verified.email
        }
      }
    }

    const isAuthorized = isApiKeyValid || Boolean(verifiedAccessEmail)
    assertInternalAuth(isAuthorized)

    // Assign identity strictly from verified source
    const authenticatedUser = isApiKeyValid
      ? API_KEY_USER_IDENTIFIER
      : verifiedAccessEmail

    c.set('accessUserEmail', authenticatedUser)
    await next()
  }
}

export { timingSafeEqual, internalAuthMiddleware }


