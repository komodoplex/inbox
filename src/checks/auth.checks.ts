import { ForbiddenError } from '@/lib/errors'
import { ERROR_CODES } from '@/constants/errors'

const ERROR_MSG_ORIGIN_NOT_PERMITTED = 'Origin is not permitted.'
const ERROR_MSG_UNAUTHORIZED_ACCESS =
  'Unauthorized access to internal endpoint.'

/**
 * Asserts that the request origin is in the allowed domains list
 */
const assertAllowedOrigin = (allowed: boolean): void => {
  if (!allowed) {
    throw new ForbiddenError(
      ERROR_CODES.INVALID_ORIGIN,
      ERROR_MSG_ORIGIN_NOT_PERMITTED
    )
  }
}

/**
 * Asserts that an internal request is authorized via Access email or API key
 */
const assertInternalAuth = (authorized: boolean): void => {
  if (!authorized) {
    throw new ForbiddenError(
      ERROR_CODES.UNAUTHORIZED,
      ERROR_MSG_UNAUTHORIZED_ACCESS
    )
  }
}

export { assertAllowedOrigin, assertInternalAuth }

