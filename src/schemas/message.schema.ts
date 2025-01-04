import { z } from 'zod'
import { INGESTION_TYPES } from '@/constants/sources'

/**
 * Public message schema for Komodoplex Studio inquiry
 */
const studioMessageSchema = z.object({
  type: z.literal(INGESTION_TYPES.KOMODOPLEX_STUDIO),
  name: z.string().trim().min(1, 'Name is required').max(200),
  email: z.string().trim().email('Invalid email address format').max(255).toLowerCase(),
  estimatedBudget: z.string().trim().max(100).optional().nullable(),
  projectBrief: z
    .string()
    .trim()
    .min(1, 'Project brief is required')
    .max(20480, 'Project brief exceeds 20KB limit'),
  turnstileToken: z.string().trim().min(1, 'Turnstile token is required'),
  website: z.string().optional(),
})

type StudioMessageInput = z.infer<typeof studioMessageSchema>

/**
 * Public message schema for Komodoplex Hello / general inquiry
 */
const helloMessageSchema = z.object({
  type: z.literal(INGESTION_TYPES.KOMODOPLEX_HELLO),
  name: z.string().trim().min(1, 'Name is required').max(200),
  email: z.string().trim().email('Invalid email address format').max(255).toLowerCase(),
  subject: z.string().trim().max(200).optional().nullable(),
  message: z
    .string()
    .trim()
    .min(1, 'Message body is required')
    .max(20480, 'Message body exceeds 20KB limit'),
  turnstileToken: z.string().trim().min(1, 'Turnstile token is required'),
  website: z.string().optional(),
})

type HelloMessageInput = z.infer<typeof helloMessageSchema>

/**
 * Public message schema for Reputask feeds subscription
 */
const feedsSubscriptionSchema = z.object({
  type: z.literal(INGESTION_TYPES.REPUTASK_FEEDS_SUBSCRIPTION),
  email: z.string().trim().email('Invalid email address format').max(255).toLowerCase(),
  turnstileToken: z.string().trim().min(1, 'Turnstile token is required'),
  website: z.string().optional(),
})

type FeedsSubscriptionInput = z.infer<typeof feedsSubscriptionSchema>

/**
 * Discriminated union schema for all public message submissions
 */
const unifiedPublicMessageSchema = z.discriminatedUnion('type', [
  studioMessageSchema,
  helloMessageSchema,
  feedsSubscriptionSchema,
])

type UnifiedPublicMessageInput = z.infer<typeof unifiedPublicMessageSchema>

type PublicMessageType = UnifiedPublicMessageInput['type']

/**
 * Schema for internal agent outbound message reply
 */
const internalMessageSchema = z.object({
  body: z
    .string()
    .trim()
    .min(1, 'Message body is required')
    .max(20480, 'Message body exceeds 20KB limit'),
  senderName: z.string().trim().max(200).optional().nullable(),
  senderEmail: z
    .string()
    .trim()
    .email('Invalid email address format')
    .max(255)
    .toLowerCase()
    .optional()
    .nullable()
    .or(z.literal('')),
})

type InternalMessageInput = z.infer<typeof internalMessageSchema>

export {
  studioMessageSchema,
  helloMessageSchema,
  feedsSubscriptionSchema,
  unifiedPublicMessageSchema,
  internalMessageSchema,
}
export type {
  StudioMessageInput,
  HelloMessageInput,
  FeedsSubscriptionInput,
  UnifiedPublicMessageInput,
  PublicMessageType,
  InternalMessageInput,
}

