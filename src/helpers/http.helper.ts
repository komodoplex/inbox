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

  /**
   * Normalize request URL pathname by stripping trailing slashes
   * (e.g. /v1/public/ -> /v1/public) while preserving method, body, and cf metadata
   */
  public static normalizeTrailingSlash(request: Request): Request {
    const url = new URL(request.url)
    const isRoot = url.pathname === '/'
    if (isRoot || !url.pathname.endsWith('/')) {
      return request
    }

    url.pathname = url.pathname.replace(/\/+$/, '')
    const normalized = new Request(url.toString(), request)
    const reqWithCf = request as Request & { cf?: IncomingRequestCfProperties }

    if (reqWithCf.cf) {
      Object.defineProperty(normalized, 'cf', {
        value: reqWithCf.cf,
        writable: false,
        enumerable: true,
        configurable: true,
      })
    }

    return normalized
  }
}

const httpHelper = HttpHelper

export { HttpHelper, httpHelper }

