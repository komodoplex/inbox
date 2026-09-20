import { describe, it, expect, beforeEach } from 'vitest'
import app from '@/index'
import { createTestDatabase } from './helpers/mock-d1'
import { timingSafeEqual } from '@/middleware/internal-auth'
import { isOriginAllowed } from '@/middleware/cors'
import { HTTP_HEADERS } from '@/constants/http'
import { ERROR_CODES } from '@/constants/errors'
import { INGESTION_TYPES } from '@/constants/sources'

describe('Security Hardening Verification Suite', () => {
  let db: D1Database

  beforeEach(async () => {
    db = await createTestDatabase()
  })

  describe('Security Headers', () => {
    it('sets standard defensive security headers on all responses', async () => {
      const res = await app.request('/health', { method: 'GET' }, { DB: db })
      expect(res.headers.get('X-Content-Type-Options')).toBe('nosniff')
      expect(res.headers.get('Referrer-Policy')).toBe('strict-origin-when-cross-origin')
      expect(res.headers.get('X-Frame-Options')).toBe('DENY')
      expect(res.headers.get('X-Request-ID')).toBeDefined()
    })
  })

  describe('Timing-Safe Secret Comparison', () => {
    it('accurately and safely compares secrets across matching and non-matching lengths', async () => {
      const secret = 'super-secret-production-internal-api-key-value-12345'
      expect(await timingSafeEqual(secret, secret)).toBe(true)
      expect(await timingSafeEqual(secret, secret + 'x')).toBe(false)
      expect(await timingSafeEqual(secret, 'short')).toBe(false)
      expect(await timingSafeEqual(secret, '')).toBe(false)
      expect(await timingSafeEqual('', '')).toBe(true)
      expect(await timingSafeEqual('abc', 'abd')).toBe(false)
    })
  })

  describe('Hardened Origin / CORS Bypasses', () => {
    const allowedDomains = ['komodoplex.com', 'reputask.xyz']

    it('rejects unencrypted HTTP origins in production', () => {
      expect(isOriginAllowed('http://komodoplex.com', allowedDomains, false)).toBe(false)
      expect(isOriginAllowed('http://reputask.xyz', allowedDomains, false)).toBe(false)
    })

    it('rejects non-standard ports in production', () => {
      expect(isOriginAllowed('https://komodoplex.com:8080', allowedDomains, false)).toBe(false)
      expect(isOriginAllowed('https://komodoplex.com:8443', allowedDomains, false)).toBe(false)
    })

    it('rejects subdomain spoofing and malformed hostnames', () => {
      expect(isOriginAllowed('https://evilkomodoplex.com', allowedDomains, false)).toBe(false)
      expect(isOriginAllowed('https://komodoplex.com.evil.com', allowedDomains, false)).toBe(false)
      expect(isOriginAllowed('https://.komodoplex.com', allowedDomains, false)).toBe(false)
      expect(isOriginAllowed('https://..komodoplex.com', allowedDomains, false)).toBe(false)
      expect(isOriginAllowed('null', allowedDomains, false)).toBe(false)
      expect(isOriginAllowed('', allowedDomains, false)).toBe(false)
    })

    it('accepts valid domains, subdomains, and normalized trailing dots', () => {
      expect(isOriginAllowed('https://komodoplex.com', allowedDomains, false)).toBe(true)
      expect(isOriginAllowed('https://studio.komodoplex.com', allowedDomains, false)).toBe(true)
      expect(isOriginAllowed('https://api.reputask.xyz', allowedDomains, false)).toBe(true)
      expect(isOriginAllowed('https://komodoplex.com.', allowedDomains, false)).toBe(true)
    })

    it('permits localhost and 127.0.0.1 in development/test only', () => {
      expect(isOriginAllowed('http://localhost:3000', allowedDomains, true)).toBe(true)
      expect(isOriginAllowed('http://127.0.0.1:8787', allowedDomains, true)).toBe(true)
      expect(isOriginAllowed('http://localhost:3000', allowedDomains, false)).toBe(false)
    })
  })

  describe('Turnstile Token Defense', () => {
    it('rejects request with missing Turnstile token with 400', async () => {
      const res = await app.request(
        '/v1/public',
        {
          method: 'POST',
          headers: {
            [HTTP_HEADERS.CONTENT_TYPE]: 'application/json',
            [HTTP_HEADERS.ORIGIN]: 'https://komodoplex.com',
          },
          body: JSON.stringify({
            type: INGESTION_TYPES.KOMODOPLEX_HELLO,
            name: 'No Turnstile',
            email: 'user@komodoplex.com',
            message: 'Testing without turnstile token',
          }),
        },
        { DB: db, TURNSTILE_SECRET_KEY: 'test-turnstile-secret' }
      )

      expect(res.status).toBe(400)
      const json = (await res.json()) as { error: { code: string } }
      expect(json.error.code).toBe(ERROR_CODES.INVALID_REQUEST)
    })
  })

  describe('IDOR and Trust Boundary Enforcement', () => {
    it('enforces authentication strictly before object access or mutation', async () => {
      const unauthEnv = {
        DB: db,
        INTERNAL_API_KEY: 'secret-key-required',
        ENVIRONMENT: 'production',
      }

      // Unauthenticated GET by ID is blocked before DB read
      const getRes = await app.request(
        '/v1/internal/conversations/conv_some_target_id',
        { method: 'GET' },
        unauthEnv
      )
      expect(getRes.status).toBe(403)

      // Unauthenticated POST reply is blocked before DB mutation
      const postRes = await app.request(
        '/v1/internal/conversations/conv_some_target_id/messages',
        {
          method: 'POST',
          headers: { [HTTP_HEADERS.CONTENT_TYPE]: 'application/json' },
          body: JSON.stringify({ body: 'Malicious outbound message injection' }),
        },
        unauthEnv
      )
      expect(postRes.status).toBe(403)

      // Unauthenticated PATCH status is blocked before DB update
      const patchRes = await app.request(
        '/v1/internal/conversations/conv_some_target_id',
        {
          method: 'PATCH',
          headers: { [HTTP_HEADERS.CONTENT_TYPE]: 'application/json' },
          body: JSON.stringify({ status: 'closed' }),
        },
        unauthEnv
      )
      expect(patchRes.status).toBe(403)
    })
  })

  describe('SQL Injection Parameterization Resilience', () => {
    it('safely binds representative SQL injection strings in parameters', async () => {
      const authEnv = {
        DB: db,
        INTERNAL_API_KEY: 'super-secret-internal-key',
        ENVIRONMENT: 'production',
      }
      const authHeaders = {
        'x-api-key': 'super-secret-internal-key',
      }

      const sqliPayload = "' OR '1'='1'; DROP TABLE conversations; --"

      // SQLi in query parameter
      const listRes = await app.request(
        `/v1/internal/conversations?source=${encodeURIComponent(sqliPayload)}`,
        { method: 'GET', headers: authHeaders },
        authEnv
      )
      expect(listRes.status).toBe(200)
      const listJson = (await listRes.json()) as { items: unknown[] }
      expect(listJson.items).toEqual([])

      // SQLi in path parameter
      const detailRes = await app.request(
        `/v1/internal/conversations/${encodeURIComponent(sqliPayload)}`,
        { method: 'GET', headers: authHeaders },
        authEnv
      )
      expect(detailRes.status).toBe(404)
    })
  })
})
