import { Hono } from 'hono'
import { bodyLimit } from 'hono/body-limit'
import { internalAuthMiddleware } from '@/middleware/internal-auth'
import {
  conversationListQuerySchema,
  patchConversationSchema,
} from '@/schemas/conversation.schema'
import { internalMessageSchema } from '@/schemas/message.schema'
import { listConversations } from '@/db/queries/conversations'
import { listAllSources } from '@/services/source.service'
import {
  addOutboundMessage,
  changeConversationStatus,
  getConversationDetails,
} from '@/services/conversation.service'
import { assertConversationExists, assertValidQueryParams } from '@/checks'
import { HttpHelper } from '@/helpers'
import { createKyselyDb } from '@/db/client'
import { ERROR_CODES } from '@/constants/errors'
import type { AppEnvironment } from '@/types/env'

const MAX_BODY_BYTES = 64 * 1024

const internalRouter = new Hono<AppEnvironment>()

internalRouter.use('*', internalAuthMiddleware())
internalRouter.use(
  '*',
  bodyLimit({
    maxSize: MAX_BODY_BYTES,
    onError: (c) => {
      return c.json(
        {
          error: {
            code: ERROR_CODES.INVALID_REQUEST,
            message: 'Payload exceeds maximum size limit (64KB).',
          },
        },
        413
      )
    },
  })
)

/**
 * List conversations with filtering and cursor pagination
 */
internalRouter.get('/conversations', async (c) => {
  const queryParams = c.req.query()
  const parsed = conversationListQuerySchema.safeParse(queryParams)
  assertValidQueryParams(parsed)

  const db = createKyselyDb(c.env.DB)
  const result = await listConversations(db, {
    status: parsed.data.status,
    sourceSlug: parsed.data.source,
    limit: parsed.data.limit,
    cursor: parsed.data.cursor,
  })

  return HttpHelper.response(c, result)
})

/**
 * Retrieve single conversation details with messages
 */
internalRouter.get('/conversations/:id', async (c) => {
  const id = c.req.param('id')
  const db = createKyselyDb(c.env.DB)
  const conversation = await getConversationDetails(db, id)
  assertConversationExists(conversation)

  return HttpHelper.response(c, conversation)
})

/**
 * Add an outbound reply message to a conversation
 */
internalRouter.post('/conversations/:id/messages', async (c) => {
  const id = c.req.param('id')
  const validated = await HttpHelper.request(c, internalMessageSchema)
  const db = createKyselyDb(c.env.DB)
  const message = await addOutboundMessage(db, id, validated)

  return HttpHelper.response(c, message, 201)
})

/**
 * Update conversation status
 */
internalRouter.patch('/conversations/:id', async (c) => {
  const id = c.req.param('id')
  const validated = await HttpHelper.request(c, patchConversationSchema)
  const db = createKyselyDb(c.env.DB)
  const updated = await changeConversationStatus(db, id, validated.status)

  return HttpHelper.response(c, updated)
})

/**
 * List all available ventures and sources
 */
internalRouter.get('/sources', async (c) => {
  const db = createKyselyDb(c.env.DB)
  const sources = await listAllSources(db)
  return HttpHelper.response(c, { sources })
})

export { internalRouter }

