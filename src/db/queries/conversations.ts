import type { Kysely } from 'kysely'
import type {
  Database,
  NewConversation,
  NewMessage,
} from '@/db/schema'
import { executeKyselyBatch } from '@/db/client'
import { DB_TABLES, SORT_ORDERS } from '@/constants/database'
import type {
  Conversation,
  ConversationListItem,
  ConversationStatus,
  Source,
} from '@/types/domain'

interface ConversationWithSource extends Conversation {
  source: Source
}

interface ListConversationsOptions {
  status?: string
  sourceSlug?: string
  limit: number
  cursor?: string
}

interface ListConversationsResult {
  items: ConversationListItem[]
  nextCursor: string | null
}

/**
 * Persist conversation and initial inbound message atomically using Kysely and D1 batch
 */
const createConversationWithMessage = async (
  db: Kysely<Database>,
  d1: D1Database,
  conversation: NewConversation,
  message: NewMessage
): Promise<void> => {
  const convQuery = db.insertInto(DB_TABLES.CONVERSATIONS).values(conversation)
  const msgQuery = db.insertInto(DB_TABLES.MESSAGES).values(message)

  await executeKyselyBatch(d1, [convQuery, msgQuery])
}

/**
 * Retrieve conversation details with its associated source
 */
const getConversationById = async (
  db: Kysely<Database>,
  id: string
): Promise<ConversationWithSource | null> => {
  const row = await db
    .selectFrom(DB_TABLES.CONVERSATIONS)
    .innerJoin(
      DB_TABLES.SOURCES,
      `${DB_TABLES.SOURCES}.id`,
      `${DB_TABLES.CONVERSATIONS}.source_id`
    )
    .select([
      `${DB_TABLES.CONVERSATIONS}.id`,
      `${DB_TABLES.CONVERSATIONS}.source_id`,
      `${DB_TABLES.CONVERSATIONS}.type`,
      `${DB_TABLES.CONVERSATIONS}.status`,
      `${DB_TABLES.CONVERSATIONS}.subject`,
      `${DB_TABLES.CONVERSATIONS}.requester_name`,
      `${DB_TABLES.CONVERSATIONS}.requester_email`,
      `${DB_TABLES.CONVERSATIONS}.created_at`,
      `${DB_TABLES.CONVERSATIONS}.updated_at`,
      `${DB_TABLES.SOURCES}.id as source_id_val`,
      `${DB_TABLES.SOURCES}.venture_id as source_venture_id`,
      `${DB_TABLES.SOURCES}.slug as source_slug`,
      `${DB_TABLES.SOURCES}.channel as source_channel`,
      `${DB_TABLES.SOURCES}.domain as source_domain`,
      `${DB_TABLES.SOURCES}.enabled as source_enabled`,
      `${DB_TABLES.SOURCES}.created_at as source_created_at`,
      `${DB_TABLES.SOURCES}.updated_at as source_updated_at`,
    ])
    .where(`${DB_TABLES.CONVERSATIONS}.id`, '=', id)
    .executeTakeFirst()

  if (!row) {
    return null
  }

  const conversation: Conversation = {
    id: row.id,
    source_id: row.source_id,
    type: row.type,
    status: row.status,
    subject: row.subject,
    requester_name: row.requester_name,
    requester_email: row.requester_email,
    created_at: row.created_at,
    updated_at: row.updated_at,
  }

  const source: Source = {
    id: row.source_id_val,
    venture_id: row.source_venture_id,
    slug: row.source_slug,
    channel: row.source_channel,
    domain: row.source_domain,
    enabled: row.source_enabled,
    created_at: row.source_created_at,
    updated_at: row.source_updated_at,
  }

  return { ...conversation, source }
}

/**
 * List conversations with filtering, sorting and cursor pagination
 */
const listConversations = async (
  db: Kysely<Database>,
  options: ListConversationsOptions
): Promise<ListConversationsResult> => {
  let query = db
    .selectFrom(DB_TABLES.CONVERSATIONS)
    .innerJoin(
      DB_TABLES.SOURCES,
      `${DB_TABLES.SOURCES}.id`,
      `${DB_TABLES.CONVERSATIONS}.source_id`
    )
    .innerJoin(
      DB_TABLES.VENTURES,
      `${DB_TABLES.VENTURES}.id`,
      `${DB_TABLES.SOURCES}.venture_id`
    )
    .select([
      `${DB_TABLES.CONVERSATIONS}.id`,
      `${DB_TABLES.CONVERSATIONS}.source_id`,
      `${DB_TABLES.CONVERSATIONS}.type`,
      `${DB_TABLES.CONVERSATIONS}.status`,
      `${DB_TABLES.CONVERSATIONS}.subject`,
      `${DB_TABLES.CONVERSATIONS}.requester_name`,
      `${DB_TABLES.CONVERSATIONS}.requester_email`,
      `${DB_TABLES.CONVERSATIONS}.created_at`,
      `${DB_TABLES.CONVERSATIONS}.updated_at`,
      `${DB_TABLES.SOURCES}.slug as source_slug`,
      `${DB_TABLES.VENTURES}.slug as venture_slug`,
      `${DB_TABLES.VENTURES}.name as venture_name`,
    ])

  if (options.status) {
    query = query.where(
      `${DB_TABLES.CONVERSATIONS}.status`,
      '=',
      options.status as ConversationStatus
    )
  }

  if (options.sourceSlug) {
    query = query.where(
      `${DB_TABLES.SOURCES}.slug`,
      '=',
      options.sourceSlug
    )
  }

  if (options.cursor) {
    const firstUnderscore = options.cursor.indexOf('_')
    if (firstUnderscore !== -1) {
      const cursorTime = Number(options.cursor.slice(0, firstUnderscore))
      const cursorId = options.cursor.slice(firstUnderscore + 1)
      if (!Number.isNaN(cursorTime) && cursorId) {
        query = query.where((eb) =>
          eb.or([
            eb(`${DB_TABLES.CONVERSATIONS}.updated_at`, '<', cursorTime),
            eb.and([
              eb(`${DB_TABLES.CONVERSATIONS}.updated_at`, '=', cursorTime),
              eb(`${DB_TABLES.CONVERSATIONS}.id`, '<', cursorId),
            ]),
          ])
        )
      }
    }
  }

  const limitPlusOne = options.limit + 1
  const rows = await query
    .orderBy(`${DB_TABLES.CONVERSATIONS}.updated_at`, SORT_ORDERS.DESC)
    .orderBy(`${DB_TABLES.CONVERSATIONS}.id`, SORT_ORDERS.DESC)
    .limit(limitPlusOne)
    .execute()

  const hasNext = rows.length > options.limit
  const items = hasNext ? rows.slice(0, options.limit) : rows

  let nextCursor: string | null = null
  if (hasNext && items.length > 0) {
    const lastItem = items[items.length - 1]
    nextCursor = `${lastItem.updated_at}_${lastItem.id}`
  }

  return { items, nextCursor }
}

/**
 * Update conversation status and updated timestamp
 */
const updateConversationStatus = async (
  db: Kysely<Database>,
  id: string,
  status: ConversationStatus,
  updatedAt: number
): Promise<boolean> => {
  const result = await db
    .updateTable(DB_TABLES.CONVERSATIONS)
    .set({ status, updated_at: updatedAt })
    .where('id', '=', id)
    .executeTakeFirst()

  const affected = result.numUpdatedRows ?? 0n
  return affected > 0n
}

/**
 * Touch conversation updated timestamp
 */
const touchConversationUpdatedAt = async (
  db: Kysely<Database>,
  id: string,
  updatedAt: number
): Promise<void> => {
  await db
    .updateTable(DB_TABLES.CONVERSATIONS)
    .set({ updated_at: updatedAt })
    .where('id', '=', id)
    .execute()
}

export {
  createConversationWithMessage,
  getConversationById,
  listConversations,
  updateConversationStatus,
  touchConversationUpdatedAt,
}
export type {
  ConversationWithSource,
  ListConversationsOptions,
  ListConversationsResult,
}

