import type { Kysely } from 'kysely'
import type { Database, MessageRow, NewMessage } from '@/db/schema'
import { DB_TABLES, SORT_ORDERS } from '@/constants/database'

/**
 * Insert a single message into the database
 */
const createMessage = async (
  db: Kysely<Database>,
  message: NewMessage
): Promise<void> => {
  await db.insertInto(DB_TABLES.MESSAGES).values(message).execute()
}

/**
 * Retrieve all messages for a given conversation ordered chronologically
 */
const getMessagesByConversationId = async (
  db: Kysely<Database>,
  conversationId: string
): Promise<MessageRow[]> => {
  return await db
    .selectFrom(DB_TABLES.MESSAGES)
    .selectAll()
    .where('conversation_id', '=', conversationId)
    .orderBy('created_at', SORT_ORDERS.ASC)
    .execute()
}

export { createMessage, getMessagesByConversationId }

