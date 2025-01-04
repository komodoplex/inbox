import type { Context } from 'hono'
import type { ContentfulStatusCode } from 'hono/utils/http-status'
import type { z } from 'zod'
import { BadRequestError } from '@/lib/errors'
import { ERROR_CODES } from '@/constants/errors'

const ERROR_MALFORMED_JSON = 'Request body must be valid JSON.'

/**
 * Standard helper for request data ingestion and HTTP response formatting
 */
class HttpHelper {
  /**
   * Parse raw request JSON body and optionally validate using a Zod schema
   */
  public static async request<T = unknown>(
    c: Context,
    schema?: z.ZodType<T>
  ): Promise<T> {
    const rawBody = await c.req.json().catch(() => {
      throw new BadRequestError(
        ERROR_CODES.INVALID_REQUEST,
        ERROR_MALFORMED_JSON
      )
    })

    if (schema) {
      return schema.parse(rawBody)
    }

    return rawBody as T
  }

  /**
   * Parse raw data into a formatted API JSON response
   */
  public static response<T>(
    c: Context,
    data: T,
    status: ContentfulStatusCode = 200
  ): Response {
    return c.json(data, status)
  }
}

const httpHelper = HttpHelper

export { HttpHelper, httpHelper }

