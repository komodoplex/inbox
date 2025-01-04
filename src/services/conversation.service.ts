import type { Kysely } from 'kysely'
import type { Database, NewConversation } from '@/db/schema'
import {
  createConversationWithMessage,
  getConversationById,
  touchConversationUpdatedAt,
  updateConversationStatus,
  type ConversationWithSource,
} from '@/db/queries/conversations'
import { createMessage, getMessagesByConversationId } from '@/db/queries/messages'
import {
  assertConversationExists,
  assertConversationUpdated,
  assertNoHoneypot,
} from '@/checks'
import type {
  InternalMessageInput,
  UnifiedPublicMessageInput,
} from '@/schemas/message.schema'
import type {
  ConversationStatus,
  ConversationType,
  ConversationWithSourceAndMessages,
  Message,
  Source,
} from '@/types/domain'
import {
  CONVERSATION_STATUSES,
  CONVERSATION_TYPES,
  MESSAGE_DIRECTIONS,
} from '@/constants/database'
import { DEFAULT_SUBJECTS, INGESTION_TYPES } from '@/constants/sources'

interface FormattedMessageDetails {
  subject: string | null
  requesterName: string | null
  requesterEmail: string | null
  body: string
}

/**
 * Format message payload based on discriminated ingestion type
 */
const formatPublicMessage = (
  input: UnifiedPublicMessageInput
): FormattedMessageDetails => {
  if (input.type === INGESTION_TYPES.KOMODOPLEX_STUDIO) {
    const body = input.estimatedBudget
      ? `Estimated Budget: ${input.estimatedBudget}\n\nProject Brief:\n${input.projectBrief}`
      : input.projectBrief

    return {
      subject: DEFAULT_SUBJECTS.STUDIO,
      requesterName: input.name,
      requesterEmail: input.email,
      body,
    }
  }

  if (input.type === INGESTION_TYPES.KOMODOPLEX_HELLO) {
    return {
      subject: input.subject || DEFAULT_SUBJECTS.HELLO,
      requesterName: input.name,
      requesterEmail: input.email,
      body: input.message,
    }
  }

  return {
    subject: DEFAULT_SUBJECTS.FEEDS,
    requesterName: null,
    requesterEmail: input.email,
    body: `Subscription request for Reputask feeds: ${input.email}`,
  }
}

/**
 * Service handling conversation and message domain logic
 */
const createPublicConversation = async (
  db: Kysely<Database>,
  d1: D1Database,
  source: Source,
  input: UnifiedPublicMessageInput,
  metadata?: Record<string, unknown>
): Promise<{ conversationId: string }> => {
  assertNoHoneypot(input.website)

  const formatted = formatPublicMessage(input)
  const now = Date.now()
  const conversationId = `conv_${crypto.randomUUID().replace(/-/g, '')}`
  const messageId = `msg_${crypto.randomUUID().replace(/-/g, '')}`

  const convType: ConversationType =
    source.channel === CONVERSATION_TYPES.SUPPORT
      ? CONVERSATION_TYPES.SUPPORT
      : CONVERSATION_TYPES.INQUIRY

  const conversation: NewConversation = {
    id: conversationId,
    source_id: source.id,
    type: convType,
    status: CONVERSATION_STATUSES.OPEN,
    subject: formatted.subject,
    requester_name: formatted.requesterName,
    requester_email: formatted.requesterEmail,
    created_at: now,
    updated_at: now,
  }

  const message: Message = {
    id: messageId,
    conversation_id: conversationId,
    direction: MESSAGE_DIRECTIONS.INBOUND,
    body: formatted.body,
    sender_name: formatted.requesterName,
    sender_email: formatted.requesterEmail,
    metadata: metadata ? JSON.stringify(metadata) : null,
    created_at: now,
  }

  await createConversationWithMessage(db, d1, conversation, message)

  return { conversationId }
}

/**
 * Retrieve a complete conversation including source and message history
 */
const getConversationDetails = async (
  db: Kysely<Database>,
  id: string
): Promise<ConversationWithSourceAndMessages | null> => {
  const conversation = await getConversationById(db, id)
  if (!conversation) {
    return null
  }

  const messages = await getMessagesByConversationId(db, id)

  return {
    ...conversation,
    messages,
  }
}

/**
 * Append an outbound agent message to an existing conversation
 */
const addOutboundMessage = async (
  db: Kysely<Database>,
  conversationId: string,
  input: InternalMessageInput
): Promise<Message> => {
  const existing = await getConversationById(db, conversationId)
  assertConversationExists(existing)

  const now = Date.now()
  const messageId = `msg_${crypto.randomUUID().replace(/-/g, '')}`

  const message: Message = {
    id: messageId,
    conversation_id: conversationId,
    direction: MESSAGE_DIRECTIONS.OUTBOUND,
    body: input.body.trim(),
    sender_name: input.senderName?.trim() || null,
    sender_email: input.senderEmail?.trim().toLowerCase() || null,
    metadata: null,
    created_at: now,
  }

  await createMessage(db, message)
  await touchConversationUpdatedAt(db, conversationId, now)

  return message
}

/**
 * Update the status of an existing conversation
 */
const changeConversationStatus = async (
  db: Kysely<Database>,
  conversationId: string,
  status: ConversationStatus
): Promise<ConversationWithSource> => {
  const now = Date.now()
  const success = await updateConversationStatus(db, conversationId, status, now)
  assertConversationUpdated(success)

  const updated = await getConversationById(db, conversationId)
  assertConversationExists(updated)

  return updated
}

export {
  formatPublicMessage,
  createPublicConversation,
  getConversationDetails,
  addOutboundMessage,
  changeConversationStatus,
}

