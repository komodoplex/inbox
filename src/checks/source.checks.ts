import { BadRequestError, ForbiddenError, NotFoundError } from '@/lib/errors'
import { ERROR_CODES } from '@/constants/errors'

const ERROR_MSG_SOURCE_NOT_FOUND = 'Source not found.'
const ERROR_MSG_SOURCE_DISABLED = 'Source is currently disabled.'
const ERROR_MSG_UNKNOWN_INGESTION_TYPE = 'Unknown ingestion type.'
const ERROR_MSG_CROSS_VENTURE_ORIGIN =
  'Origin not permitted for this message type.'

/**
 * Asserts that a queried source exists in the database
 */
function assertSourceExists<T>(
  source: T | null | undefined
): asserts source is T {
  if (!source) {
    throw new NotFoundError(
      ERROR_CODES.SOURCE_NOT_FOUND,
      ERROR_MSG_SOURCE_NOT_FOUND
    )
  }
}

/**
 * Asserts that the source is currently enabled for ingestion
 */
const assertSourceEnabled = (source: { enabled: number }): void => {
  if (source.enabled !== 1) {
    throw new BadRequestError(
      ERROR_CODES.SOURCE_DISABLED,
      ERROR_MSG_SOURCE_DISABLED
    )
  }
}

/**
 * Asserts that a configuration exists for the specified ingestion type
 */
function assertValidIngestionType<T>(
  config: T | null | undefined
): asserts config is T {
  if (!config) {
    throw new BadRequestError(
      ERROR_CODES.INVALID_REQUEST,
      ERROR_MSG_UNKNOWN_INGESTION_TYPE
    )
  }
}

/**
 * Asserts that the request origin is permitted for this specific source
 */
const assertSourceOriginAllowed = (
  origin: string | undefined,
  allowedDomains: readonly string[] | string[],
  isDev: boolean = false
): void => {
  if (!origin) {
    return
  }

  try {
    const url = new URL(origin)
    const hostname = url.hostname.toLowerCase()
    if (isDev && (hostname === 'localhost' || hostname === '127.0.0.1')) {
      return
    }

    const matches = allowedDomains.some(
      (domain) => hostname === domain || hostname.endsWith(`.${domain}`)
    )
    if (!matches) {
      throw new ForbiddenError(
        ERROR_CODES.INVALID_ORIGIN,
        ERROR_MSG_CROSS_VENTURE_ORIGIN
      )
    }
  } catch (err) {
    if (err instanceof ForbiddenError) {
      throw err
    }
    throw new ForbiddenError(
      ERROR_CODES.INVALID_ORIGIN,
      ERROR_MSG_CROSS_VENTURE_ORIGIN
    )
  }
}

export {
  assertSourceExists,
  assertSourceEnabled,
  assertValidIngestionType,
  assertSourceOriginAllowed,
}


