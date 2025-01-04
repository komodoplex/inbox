import { describe, it, expect, beforeEach } from 'vitest'
import app from '@/index'
import { createTestDatabase } from './helpers/mock-d1'
import { createKyselyDb } from '@/db/client'
import { resolveSource } from '@/services/source.service'
import {
  createConversationWithMessage,
  getConversationById,
} from '@/db/queries/conversations'
import type { Conversation, Message } from '@/types/domain'
import {
  CONVERSATION_STATUSES,
  CONVERSATION_TYPES,
  MESSAGE_DIRECTIONS,
} from '@/constants/database'
import { SOURCE_SLUGS } from '@/constants/sources'

describe('Atomicity & Health Tests', () => {
  let db: D1Database

  beforeEach(async () => {
    db = await createTestDatabase()
  })

  it('verifies /health returns ok: true', async () => {
    const res = await app.request('/health', { method: 'GET' }, { DB: db })
    expect(res.status).toBe(200)
    const json = (await res.json()) as { ok: boolean }
    expect(json.ok).toBe(true)
  })

  it('guarantees atomic persistence via batch transaction rollback on failure', async () => {
    const kysely = createKyselyDb(db)
    const source = await resolveSource(kysely, SOURCE_SLUGS.KOMODOPLEX_STUDIO_TALK)
    const now = Date.now()

    const conversation: Conversation = {
      id: 'conv_atomic_test',
      source_id: source.id,
      type: CONVERSATION_TYPES.INQUIRY,
      status: CONVERSATION_STATUSES.OPEN,
      subject: 'Test Subject',
      requester_name: 'Tester',
      requester_email: 'tester@komodoplex.com',
      created_at: now,
      updated_at: now,
    }

    const invalidMessage: Message = {
      id: 'msg_atomic_test',
      conversation_id: 'conv_non_existent_foreign_key_fail',
      direction: MESSAGE_DIRECTIONS.INBOUND,
      body: 'Test Body',
      sender_name: null,
      sender_email: null,
      metadata: null,
      created_at: now,
    }

    await db.exec('PRAGMA foreign_keys = ON;')

    await expect(
      createConversationWithMessage(kysely, db, conversation, invalidMessage)
    ).rejects.toThrow()

    const savedConv = await getConversationById(kysely, 'conv_atomic_test')
    expect(savedConv).toBeNull()
  })
})
