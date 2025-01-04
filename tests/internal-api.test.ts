import { describe, it, expect, beforeEach } from 'vitest'
import app from '@/index'
import { createTestDatabase } from './helpers/mock-d1'
import { createKyselyDb } from '@/db/client'
import { createPublicConversation } from '@/services/conversation.service'
import { resolveSource } from '@/services/source.service'
import type {
  ConversationStatus,
  ConversationWithSourceAndMessages,
  Message,
} from '@/types/domain'
import {
  CONVERSATION_STATUSES,
  MESSAGE_DIRECTIONS,
} from '@/constants/database'
import { INGESTION_TYPES, SOURCE_SLUGS } from '@/constants/sources'

describe('Internal Conversation Management API', () => {
  let db: D1Database

  beforeEach(async () => {
    db = await createTestDatabase()
  })

  it('lists conversations, retrieves detail, updates status, and appends outbound message', async () => {
    const kysely = createKyselyDb(db)
    const source = await resolveSource(kysely, SOURCE_SLUGS.KOMODOPLEX_STUDIO_TALK)

    const created1 = await createPublicConversation(kysely, db, source, {
      type: INGESTION_TYPES.KOMODOPLEX_HELLO,
      name: 'Alice Client',
      email: 'alice@example.com',
      subject: 'Consulting request',
      message: 'Can you help us build an agent?',
      turnstileToken: 'dummy',
    })

    const created2 = await createPublicConversation(kysely, db, source, {
      type: INGESTION_TYPES.KOMODOPLEX_HELLO,
      name: 'Bob Client',
      email: 'bob@example.com',
      subject: 'Integration request',
      message: 'Need help connecting API.',
      turnstileToken: 'dummy',
    })

    const testEnv = {
      DB: db,
      INTERNAL_API_KEY: 'test-internal-key',
      ENVIRONMENT: 'test',
    }
    const authHeaders = {
      'x-api-key': 'test-internal-key',
    }

    const listRes = await app.request(
      '/v1/internal/conversations?limit=10',
      { method: 'GET', headers: authHeaders },
      testEnv
    )

    expect(listRes.status).toBe(200)
    const listJson = (await listRes.json()) as {
      items: Array<{ id: string; requester_name: string }>
      nextCursor: string | null
    }
    expect(listJson.items.length).toBe(2)
    const returnedIds = listJson.items.map((item) => item.id)
    expect(returnedIds).toContain(created1.conversationId)
    expect(returnedIds).toContain(created2.conversationId)

    const detailRes = await app.request(
      `/v1/internal/conversations/${created1.conversationId}`,
      { method: 'GET', headers: authHeaders },
      testEnv
    )

    expect(detailRes.status).toBe(200)
    const detailJson = (await detailRes.json()) as ConversationWithSourceAndMessages
    expect(detailJson.id).toBe(created1.conversationId)
    expect(detailJson.source.slug).toBe(SOURCE_SLUGS.KOMODOPLEX_STUDIO_TALK)
    expect(detailJson.messages.length).toBe(1)
    expect(detailJson.messages[0].direction).toBe(MESSAGE_DIRECTIONS.INBOUND)
    expect(detailJson.messages[0].body).toBe('Can you help us build an agent?')

    const replyRes = await app.request(
      `/v1/internal/conversations/${created1.conversationId}/messages`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...authHeaders,
        },
        body: JSON.stringify({
          body: 'Hello Alice, we would love to help.',
          senderName: 'Support Agent',
          senderEmail: 'support@komodoplex.com',
        }),
      },
      testEnv
    )

    expect(replyRes.status).toBe(201)
    const replyJson = (await replyRes.json()) as Message
    expect(replyJson.direction).toBe(MESSAGE_DIRECTIONS.OUTBOUND)
    expect(replyJson.body).toBe('Hello Alice, we would love to help.')
    expect(replyJson.sender_name).toBe('Support Agent')

    const patchRes = await app.request(
      `/v1/internal/conversations/${created1.conversationId}`,
      {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          ...authHeaders,
        },
        body: JSON.stringify({ status: CONVERSATION_STATUSES.RESOLVED }),
      },
      testEnv
    )

    expect(patchRes.status).toBe(200)
    const patchJson = (await patchRes.json()) as {
      id: string
      status: ConversationStatus
    }
    expect(patchJson.status).toBe(CONVERSATION_STATUSES.RESOLVED)

    const reDetailRes = await app.request(
      `/v1/internal/conversations/${created1.conversationId}`,
      { method: 'GET', headers: authHeaders },
      testEnv
    )
    const reDetailJson = (await reDetailRes.json()) as ConversationWithSourceAndMessages
    expect(reDetailJson.status).toBe(CONVERSATION_STATUSES.RESOLVED)
    expect(reDetailJson.messages.length).toBe(2)
    expect(reDetailJson.messages[0].direction).toBe(MESSAGE_DIRECTIONS.INBOUND)
    expect(reDetailJson.messages[1].direction).toBe(MESSAGE_DIRECTIONS.OUTBOUND)
  })

  it('lists all registered sources and ventures', async () => {
    const testEnv = {
      DB: db,
      INTERNAL_API_KEY: 'test-internal-key',
      ENVIRONMENT: 'test',
    }
    const res = await app.request(
      '/v1/internal/sources',
      { method: 'GET', headers: { 'x-api-key': 'test-internal-key' } },
      testEnv
    )
    expect(res.status).toBe(200)
    const json = (await res.json()) as {
      sources: Array<{ slug: string; venture_name: string }>
    }
    expect(json.sources.length).toBe(5)
    const slugs = json.sources.map((s) => s.slug)
    expect(slugs).toContain(SOURCE_SLUGS.KOMODOPLEX_STUDIO_TALK)
    expect(slugs).toContain(SOURCE_SLUGS.KOMODOPLEX_HELLO)
    expect(slugs).toContain('komodoplex-support')
    expect(slugs).toContain('reputask-contact')
    expect(slugs).toContain(SOURCE_SLUGS.REPUTASK_FEEDS)
  })

  it('authenticates with Cloudflare Access header or API key', async () => {
    const envWithKey = {
      DB: db,
      INTERNAL_API_KEY: 'super-secret-internal-key',
      ENVIRONMENT: 'test',
    }

    const deniedRes = await app.request(
      '/v1/internal/sources',
      { method: 'GET' },
      envWithKey
    )
    expect(deniedRes.status).toBe(403)

    const wrongKeyRes = await app.request(
      '/v1/internal/sources',
      {
        method: 'GET',
        headers: { 'x-api-key': 'wrong-key-attempt' },
      },
      envWithKey
    )
    expect(wrongKeyRes.status).toBe(403)

    const allowedKeyRes = await app.request(
      '/v1/internal/sources',
      {
        method: 'GET',
        headers: { 'x-api-key': 'super-secret-internal-key' },
      },
      envWithKey
    )
    expect(allowedKeyRes.status).toBe(200)

    const allowedAccessRes = await app.request(
      '/v1/internal/sources',
      {
        method: 'GET',
        headers: {
          'cf-access-authenticated-user-email': 'admin@komodoplex.com',
        },
      },
      envWithKey
    )
    expect(allowedAccessRes.status).toBe(200)

    // Production environment checks
    const prodEnv = {
      DB: db,
      INTERNAL_API_KEY: 'super-secret-internal-key',
      ENVIRONMENT: 'production',
    }

    const prodSpoofedRes = await app.request(
      '/v1/internal/sources',
      {
        method: 'GET',
        headers: {
          'cf-access-authenticated-user-email': 'attacker@evil.com',
        },
      },
      prodEnv
    )
    expect(prodSpoofedRes.status).toBe(403)

    const prodValidJwtRes = await app.request(
      '/v1/internal/sources',
      {
        method: 'GET',
        headers: {
          'cf-access-authenticated-user-email': 'admin@komodoplex.com',
          'cf-access-jwt-assertion': 'valid-mock-jwt-signature',
        },
      },
      prodEnv
    )
    expect(prodValidJwtRes.status).toBe(200)
  })
})
