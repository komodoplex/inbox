import type { Context } from 'hono'
import { HTTPException } from 'hono/http-exception'
import { z } from 'zod'
import { AppError } from '@/lib/errors'
import { ERROR_CODES } from '@/constants/errors'
import type { AppEnvironment } from '@/types/env'

const DEFAULT_REQUEST_ID = 'unknown'
const LOG_INTERNAL_ERROR = 'internal_server_error'

interface ErrorResponseBody {
  error: {
    code: string
    message: string
  }
}

/**
 * Global error handler conforming to standard API error schema
 */
const errorHandler = (
  error: Error,
  c: Context<AppEnvironment>
): Response => {
  const requestId = c.get('requestId') || DEFAULT_REQUEST_ID

  if (error instanceof AppError) {
    return c.json<ErrorResponseBody>(
      {
        error: {
          code: error.code,
          message: error.message,
        },
      },
      error.statusCode as 400 | 403 | 404 | 429 | 500
    )
  }

  if (error instanceof z.ZodError) {
    const firstIssue = error.issues[0]
    const message = firstIssue
      ? `${firstIssue.path.join('.')}: ${firstIssue.message}`
      : 'Validation failed.'

    return c.json<ErrorResponseBody>(
      {
        error: {
          code: ERROR_CODES.INVALID_REQUEST,
          message,
        },
      },
      400
    )
  }

  if (error instanceof SyntaxError) {
    return c.json<ErrorResponseBody>(
      {
        error: {
          code: ERROR_CODES.INVALID_REQUEST,
          message: 'Malformed JSON payload.',
        },
      },
      400
    )
  }

  if (error instanceof HTTPException) {
    const code =
      error.status === 404 ? ERROR_CODES.NOT_FOUND : ERROR_CODES.INVALID_REQUEST
    return c.json<ErrorResponseBody>(
      {
        error: {
          code,
          message: error.message || 'Request failed.',
        },
      },
      error.status
    )
  }

  console.error(
    JSON.stringify({
      event: LOG_INTERNAL_ERROR,
      requestId,
      message: error.message,
      timestamp: Date.now(),
    })
  )

  return c.json<ErrorResponseBody>(
    {
      error: {
        code: ERROR_CODES.INTERNAL_SERVER_ERROR,
        message: 'Internal server error.',
      },
    },
    500
  )
}

export { errorHandler }
export type { ErrorResponseBody }

