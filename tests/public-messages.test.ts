import { describe, it, expect, beforeEach } from 'vitest'
import app from '@/index'
import { createTestDatabase } from './helpers/mock-d1'
import { resetRateLimitStore } from '@/services/rate-limit.service'
import {
  ALLOWED_ORIGIN_DOMAINS,
  INGESTION_TYPES,
} from '@/constants/sources'
import { ERROR_CODES } from '@/constants/errors'
import { HTTP_HEADERS } from '@/constants/http'

describe('Unified Public Messages Ingestion API (/v1/public)', () => {
  let db: D1Database

  beforeEach(async () => {
    db = await createTestDatabase()
    resetRateLimitStore()
  })

  it('successfully ingests a valid KOMODOPLEX_STUDIO message', async () => {
    const res = await app.request(
      '/v1/public',
      {
        method: 'POST',
        headers: {
          [HTTP_HEADERS.CONTENT_TYPE]: 'application/json',
          [HTTP_HEADERS.ORIGIN]: `https://${ALLOWED_ORIGIN_DOMAINS.KOMODOPLEX}`,
        },
        body: JSON.stringify({
          type: INGESTION_TYPES.KOMODOPLEX_STUDIO,
          name: 'Jane Doe',
          email: 'jane@example.com',
          estimatedBudget: '$5k-$10k',
          projectBrief: 'We would like to build a new agentic system.',
          turnstileToken: 'test-pass-token',
        }),
      },
      {
        DB: db,
        TURNSTILE_SECRET_KEY: 'test-turnstile-secret',
      }
    )

    expect(res.status).toBe(201)
    const json = (await res.json()) as { success: boolean; conversationId: string }
    expect(json.success).toBe(true)
    expect(json.conversationId).toMatch(/^conv_[a-f0-9]+$/)
    expect(res.headers.get(HTTP_HEADERS.ACCESS_CONTROL_ALLOW_ORIGIN)).toBe(
      `https://${ALLOWED_ORIGIN_DOMAINS.KOMODOPLEX}`
    )
    expect(res.headers.get(HTTP_HEADERS.X_REQUEST_ID)).toBeDefined()
  })

  it('successfully ingests a valid KOMODOPLEX_HELLO message', async () => {
    const res = await app.request(
      '/v1/public',
      {
        method: 'POST',
        headers: {
          [HTTP_HEADERS.CONTENT_TYPE]: 'application/json',
          [HTTP_HEADERS.ORIGIN]: `https://${ALLOWED_ORIGIN_DOMAINS.KOMODOPLEX}`,
        },
        body: JSON.stringify({
          type: INGESTION_TYPES.KOMODOPLEX_HELLO,
          name: 'Alice',
          email: 'alice@komodoplex.com',
          subject: 'Hello from partner',
          message: 'Just dropping by to say hello.',
          turnstileToken: 'test-pass-token',
        }),
      },
      {
        DB: db,
        TURNSTILE_SECRET_KEY: 'test-turnstile-secret',
      }
    )

    expect(res.status).toBe(201)
    const json = (await res.json()) as { success: boolean; conversationId: string }
    expect(json.success).toBe(true)
    expect(json.conversationId).toBeDefined()
  })

  it('successfully ingests a valid REPUTASK_FEEDS_SUBSCRIPTION message', async () => {
    const res = await app.request(
      '/v1/public',
      {
        method: 'POST',
        headers: {
          [HTTP_HEADERS.CONTENT_TYPE]: 'application/json',
          [HTTP_HEADERS.ORIGIN]: `https://${ALLOWED_ORIGIN_DOMAINS.REPUTASK}`,
        },
        body: JSON.stringify({
          type: INGESTION_TYPES.REPUTASK_FEEDS_SUBSCRIPTION,
          email: 'subscriber@reputask.xyz',
          turnstileToken: 'test-pass-token',
        }),
      },
      {
        DB: db,
        TURNSTILE_SECRET_KEY: 'test-turnstile-secret',
      }
    )

    expect(res.status).toBe(201)
    const json = (await res.json()) as { success: boolean; conversationId: string }
    expect(json.success).toBe(true)
    expect(json.conversationId).toBeDefined()
  })

  it('rejects an invalid ingestion type with 400', async () => {
    const res = await app.request(
      '/v1/public',
      {
        method: 'POST',
        headers: { [HTTP_HEADERS.CONTENT_TYPE]: 'application/json' },
        body: JSON.stringify({
          type: 'INVALID_UNKNOWN_TYPE',
          email: 'test@example.com',
          turnstileToken: 'test-pass-token',
        }),
      },
      {
        DB: db,
        TURNSTILE_SECRET_KEY: 'test-turnstile-secret',
      }
    )

    expect(res.status).toBe(400)
    const json = (await res.json()) as { error: { code: string; message: string } }
    expect(json.error.code).toBe(ERROR_CODES.INVALID_REQUEST)
  })

  it('rejects an invalid request body that is not JSON with 400', async () => {
    const res = await app.request(
      '/v1/public',
      {
        method: 'POST',
        headers: { [HTTP_HEADERS.CONTENT_TYPE]: 'application/json' },
        body: 'invalid-non-json-string',
      },
      {
        DB: db,
        TURNSTILE_SECRET_KEY: 'test-turnstile-secret',
      }
    )

    expect(res.status).toBe(400)
    const json = (await res.json()) as { error: { code: string } }
    expect(json.error.code).toBe(ERROR_CODES.INVALID_REQUEST)
  })

  it('rejects missing required fields for studio type with 400', async () => {
    const res = await app.request(
      '/v1/public',
      {
        method: 'POST',
        headers: { [HTTP_HEADERS.CONTENT_TYPE]: 'application/json' },
        body: JSON.stringify({
          type: INGESTION_TYPES.KOMODOPLEX_STUDIO,
          name: 'Tester',
          email: 'test@example.com',
          turnstileToken: 'test-pass-token',
        }),
      },
      {
        DB: db,
        TURNSTILE_SECRET_KEY: 'test-turnstile-secret',
      }
    )

    expect(res.status).toBe(400)
    const json = (await res.json()) as { error: { code: string } }
    expect(json.error.code).toBe(ERROR_CODES.INVALID_REQUEST)
  })

  it('rejects a malformed email format with 400', async () => {
    const res = await app.request(
      '/v1/public',
      {
        method: 'POST',
        headers: { [HTTP_HEADERS.CONTENT_TYPE]: 'application/json' },
        body: JSON.stringify({
          type: INGESTION_TYPES.KOMODOPLEX_HELLO,
          name: 'Tester',
          email: 'not-an-email',
          message: 'Hello world',
          turnstileToken: 'test-pass-token',
        }),
      },
      {
        DB: db,
        TURNSTILE_SECRET_KEY: 'test-turnstile-secret',
      }
    )

    expect(res.status).toBe(400)
    const json = (await res.json()) as { error: { code: string } }
    expect(json.error.code).toBe(ERROR_CODES.INVALID_REQUEST)
  })

  it('rejects when Turnstile verification fails with 400', async () => {
    const res = await app.request(
      '/v1/public',
      {
        method: 'POST',
        headers: { [HTTP_HEADERS.CONTENT_TYPE]: 'application/json' },
        body: JSON.stringify({
          type: INGESTION_TYPES.KOMODOPLEX_HELLO,
          name: 'Tester',
          email: 'test@example.com',
          message: 'Valid message body',
          turnstileToken: 'invalid-failing-token',
        }),
      },
      {
        DB: db,
        TURNSTILE_SECRET_KEY: 'production-secret-key-that-rejects',
      }
    )

    expect(res.status).toBe(400)
    const json = (await res.json()) as { error: { code: string } }
    expect(json.error.code).toBe(ERROR_CODES.INVALID_TURNSTILE_TOKEN)
  })

  it('rejects spam bot honeypot submission with 400', async () => {
    const res = await app.request(
      '/v1/public',
      {
        method: 'POST',
        headers: { [HTTP_HEADERS.CONTENT_TYPE]: 'application/json' },
        body: JSON.stringify({
          type: INGESTION_TYPES.REPUTASK_FEEDS_SUBSCRIPTION,
          email: 'bot@example.com',
          website: 'http://spam-link.xyz',
          turnstileToken: 'test-pass-token',
        }),
      },
      {
        DB: db,
        TURNSTILE_SECRET_KEY: 'test-turnstile-secret',
      }
    )

    expect(res.status).toBe(400)
    const json = (await res.json()) as { error: { code: string } }
    expect(json.error.code).toBe(ERROR_CODES.INVALID_REQUEST)
  })

  it('enforces rate limiting policy returning 429 after 5 requests', async () => {
    const payload = JSON.stringify({
      type: INGESTION_TYPES.REPUTASK_FEEDS_SUBSCRIPTION,
      email: 'rate@example.com',
      turnstileToken: 'test-pass-token',
    })
    const env = {
      DB: db,
      TURNSTILE_SECRET_KEY: 'test-turnstile-secret',
    }
    const headers = {
      [HTTP_HEADERS.CONTENT_TYPE]: 'application/json',
      [HTTP_HEADERS.CF_CONNECTING_IP]: '203.0.113.88',
    }

    for (let i = 0; i < 5; i++) {
      const okRes = await app.request(
        '/v1/public',
        { method: 'POST', headers, body: payload },
        env
      )
      expect(okRes.status).toBe(201)
    }

    const blockedRes = await app.request(
      '/v1/public',
      { method: 'POST', headers, body: payload },
      env
    )
    expect(blockedRes.status).toBe(429)
    const json = (await blockedRes.json()) as {
      error: { code: string; message: string }
    }
    expect(json.error.code).toBe(ERROR_CODES.RATE_LIMITED)
  })

  it('handles CORS preflight OPTIONS and rejects unauthorized origin with 403', async () => {
    const preflight = await app.request(
      '/v1/public',
      {
        method: 'OPTIONS',
        headers: {
          [HTTP_HEADERS.ORIGIN]: `https://${ALLOWED_ORIGIN_DOMAINS.KOMODOPLEX}`,
        },
      },
      { DB: db }
    )

    expect(preflight.status).toBe(204)
    expect(
      preflight.headers.get(HTTP_HEADERS.ACCESS_CONTROL_ALLOW_ORIGIN)
    ).toBe(`https://${ALLOWED_ORIGIN_DOMAINS.KOMODOPLEX}`)
    expect(
      preflight.headers.get(HTTP_HEADERS.ACCESS_CONTROL_ALLOW_METHODS)
    ).toContain('POST')

    const forbiddenRes = await app.request(
      '/v1/public',
      {
        method: 'POST',
        headers: {
          [HTTP_HEADERS.CONTENT_TYPE]: 'application/json',
          [HTTP_HEADERS.ORIGIN]: 'https://unauthorized-attacker.com',
        },
        body: JSON.stringify({
          type: INGESTION_TYPES.KOMODOPLEX_HELLO,
          name: 'Attacker',
          email: 'attacker@bad.com',
          message: 'Attacking',
          turnstileToken: 'test-pass-token',
        }),
      },
      {
        DB: db,
        TURNSTILE_SECRET_KEY: 'test-turnstile-secret',
        ENVIRONMENT: 'production',
      }
    )

    expect(forbiddenRes.status).toBe(403)
    const json = (await forbiddenRes.json()) as { error: { code: string } }
    expect(json.error.code).toBe(ERROR_CODES.INVALID_ORIGIN)
  })

  it('rejects cross-venture submission when origin does not match specific ingestion type', async () => {
    const res = await app.request(
      '/v1/public',
      {
        method: 'POST',
        headers: {
          [HTTP_HEADERS.CONTENT_TYPE]: 'application/json',
          [HTTP_HEADERS.ORIGIN]: `https://${ALLOWED_ORIGIN_DOMAINS.REPUTASK}`,
        },
        body: JSON.stringify({
          type: INGESTION_TYPES.KOMODOPLEX_STUDIO,
          name: 'Cross Venture Tester',
          email: 'test@reputask.xyz',
          projectBrief: 'Attempting cross-venture ingestion',
          turnstileToken: 'test-pass-token',
        }),
      },
      {
        DB: db,
        TURNSTILE_SECRET_KEY: 'test-turnstile-secret',
        ENVIRONMENT: 'production',
      }
    )

    expect(res.status).toBe(403)
    const json = (await res.json()) as { error: { code: string } }
    expect(json.error.code).toBe(ERROR_CODES.INVALID_ORIGIN)
  })

  it('rejects payload exceeding 64KB with 413', async () => {
    const hugeMessage = 'A'.repeat(65 * 1024)
    const res = await app.request(
      '/v1/public',
      {
        method: 'POST',
        headers: {
          [HTTP_HEADERS.CONTENT_TYPE]: 'application/json',
          [HTTP_HEADERS.ORIGIN]: `https://${ALLOWED_ORIGIN_DOMAINS.KOMODOPLEX}`,
        },
        body: JSON.stringify({
          type: INGESTION_TYPES.KOMODOPLEX_HELLO,
          name: 'Flooder',
          email: 'flooder@example.com',
          message: hugeMessage,
          turnstileToken: 'test-pass-token',
        }),
      },
      {
        DB: db,
        TURNSTILE_SECRET_KEY: 'test-turnstile-secret',
      }
    )

    expect(res.status).toBe(413)
  })

  it('prevents test-pass-token bypass when production secret key is configured', async () => {
    const res = await app.request(
      '/v1/public',
      {
        method: 'POST',
        headers: {
          [HTTP_HEADERS.CONTENT_TYPE]: 'application/json',
          [HTTP_HEADERS.ORIGIN]: `https://${ALLOWED_ORIGIN_DOMAINS.KOMODOPLEX}`,
        },
        body: JSON.stringify({
          type: INGESTION_TYPES.KOMODOPLEX_HELLO,
          name: 'Attacker',
          email: 'attacker@example.com',
          message: 'Testing bypass prevention',
          turnstileToken: 'test-pass-token',
        }),
      },
      {
        DB: db,
        TURNSTILE_SECRET_KEY: '0x4AAAAAAAPROD_REAL_SECRET_KEY',
        ENVIRONMENT: 'production',
      }
    )

    expect(res.status).toBe(400)
    const json = (await res.json()) as { error: { code: string } }
    expect(json.error.code).toBe(ERROR_CODES.INVALID_TURNSTILE_TOKEN)
  })
})

