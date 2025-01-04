import { Hono, type Context } from 'hono'
import { bodyLimit } from 'hono/body-limit'
import { publicCorsMiddleware } from '@/middleware/cors'
import {
  extractClientIp,
  publicRateLimitMiddleware,
} from '@/middleware/rate-limit'
import { unifiedPublicMessageSchema } from '@/schemas/message.schema'
import { getSourceForType, INGESTION_CONFIG } from '@/services/source.service'
import { createPublicConversation } from '@/services/conversation.service'
import { verifyTurnstileToken } from '@/services/turnstile.service'
import { assertSourceOriginAllowed, assertTurnstileValid } from '@/checks'
import { BadRequestError } from '@/lib/errors'
import { createKyselyDb } from '@/db/client'
import { HttpHelper } from '@/helpers'
import { ERROR_CODES } from '@/constants/errors'
import { HTTP_HEADERS, LOG_EVENTS } from '@/constants/http'
import type { AppEnvironment } from '@/types/env'

const MAX_BODY_BYTES = 64 * 1024

const publicRouter = new Hono<AppEnvironment>()

publicRouter.use('*', publicCorsMiddleware())
publicRouter.use(
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
publicRouter.use('*', publicRateLimitMiddleware())

/**
 * Handle unified public message intake
 */
const ingestMessage = async (c: Context<AppEnvironment>): Promise<Response> => {
  const startTime = Date.now()
  const requestId = c.get('requestId')
  const isDevOrTest =
    c.env.ENVIRONMENT === 'development' || c.env.ENVIRONMENT === 'test'

  const validatedInput = await HttpHelper.request(
    c,
    unifiedPublicMessageSchema
  )

  const origin = c.req.header(HTTP_HEADERS.ORIGIN)
  assertSourceOriginAllowed(
    origin,
    INGESTION_CONFIG[validatedInput.type].allowedDomains,
    isDevOrTest
  )

  const clientIp = extractClientIp(
    c.req.header(HTTP_HEADERS.CF_CONNECTING_IP),
    c.req.header(HTTP_HEADERS.X_FORWARDED_FOR),
    isDevOrTest
  )

  const isTokenValid = await verifyTurnstileToken(
    c.env.TURNSTILE_SECRET_KEY,
    validatedInput.turnstileToken,
    clientIp
  )

  assertTurnstileValid(isTokenValid)

  const db = createKyselyDb(c.env.DB)
  const source = await getSourceForType(db, validatedInput.type)

  const clientMetadata: Record<string, unknown> = {}
  const country = c.req.raw.cf?.country
  if (country) {
    clientMetadata.country = country
  }

  const { conversationId } = await createPublicConversation(
    db,
    c.env.DB,
    source,
    validatedInput,
    clientMetadata
  )

  const latencyMs = Date.now() - startTime
  console.log(
    JSON.stringify({
      event: LOG_EVENTS.MESSAGE_INGESTED,
      requestId,
      type: validatedInput.type,
      sourceSlug: source.slug,
      conversationId,
      latencyMs,
    })
  )

  return HttpHelper.response(
    c,
    {
      success: true,
      conversationId,
    },
    201
  )
}

publicRouter.post('/', ingestMessage)
publicRouter.post('', ingestMessage)

export { publicRouter }

