import { z } from 'zod'
import {
  CONVERSATION_STATUSES,
  CONVERSATION_TYPES,
} from '@/constants/database'

/**
 * Valid conversation status values
 */
const conversationStatusEnum = z.enum([
  CONVERSATION_STATUSES.OPEN,
  CONVERSATION_STATUSES.PENDING,
  CONVERSATION_STATUSES.RESOLVED,
  CONVERSATION_STATUSES.CLOSED,
  CONVERSATION_STATUSES.SPAM,
])

/**
 * Valid conversation type values
 */
const conversationTypeEnum = z.enum([
  CONVERSATION_TYPES.INQUIRY,
  CONVERSATION_TYPES.SUPPORT,
])

/**
 * Schema for querying conversations in internal admin
 */
const conversationListQuerySchema = z.object({
  status: conversationStatusEnum.optional(),
  source: z.string().trim().optional(),
  limit: z.coerce.number().int().min(1).max(100).default(25),
  cursor: z.string().trim().optional(),
})

type ConversationListQuery = z.infer<typeof conversationListQuerySchema>

/**
 * Schema for patching conversation properties
 */
const patchConversationSchema = z.object({
  status: conversationStatusEnum,
})

type PatchConversationInput = z.infer<typeof patchConversationSchema>

export {
  conversationStatusEnum,
  conversationTypeEnum,
  conversationListQuerySchema,
  patchConversationSchema,
}
export type {
  ConversationListQuery,
  PatchConversationInput,
}

