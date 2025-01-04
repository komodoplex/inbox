import type { MiddlewareHandler } from 'hono'
import { assertInternalAuth } from '@/checks'
import { HTTP_HEADERS } from '@/constants/http'
import type { AppEnvironment } from '@/types/env'

const CF_ACCESS_EMAIL_HEADER = 'cf-access-authenticated-user-email'
const CF_ACCESS_JWT_HEADER = 'cf-access-jwt-assertion'
const X_API_KEY_HEADER = 'x-api-key'
const BEARER_PREFIX_REGEX = /^Bearer\s+/i
const API_KEY_USER_IDENTIFIER = 'api-key-user'

/**
 * Constant-time byte comparison to prevent timing attacks on secrets
 */
const timingSafeEqual = (a: string, b: string): boolean => {
  const enc = new TextEncoder()
  const aBuf = enc.encode(a)
  const bBuf = enc.encode(b)
  if (aBuf.byteLength !== bBuf.byteLength) {
    return false
  }

  let diff = 0
  for (let i = 0; i < aBuf.byteLength; i++) {
    diff |= aBuf[i] ^ bBuf[i]
  }
  return diff === 0
}

/**
 * Cloudflare Access identity reader and fail-closed internal access guard
 */
const internalAuthMiddleware = (): MiddlewareHandler<AppEnvironment> => {
  return async (c, next) => {
    const accessEmail = c.req.header(CF_ACCESS_EMAIL_HEADER)
    const accessJwt = c.req.header(CF_ACCESS_JWT_HEADER)
    const apiKey =
      c.req.header(X_API_KEY_HEADER) ||
      c.req.header(HTTP_HEADERS.AUTHORIZATION)?.replace(BEARER_PREFIX_REGEX, '')
    const expectedApiKey = c.env.INTERNAL_API_KEY
    const isDevOrTest =
      c.env.ENVIRONMENT === 'development' || c.env.ENVIRONMENT === 'test'

    const isApiKeyValid = Boolean(
      expectedApiKey && apiKey && timingSafeEqual(apiKey, expectedApiKey)
    )
    const isAccessValid = Boolean(
      accessEmail && (isDevOrTest || accessJwt)
    )

    const isAuthorized = isApiKeyValid || isAccessValid
    assertInternalAuth(isAuthorized)

    c.set(
      'accessUserEmail',
      accessEmail || (isApiKeyValid ? API_KEY_USER_IDENTIFIER : null)
    )
    await next()
  }
}

export { timingSafeEqual, internalAuthMiddleware }


