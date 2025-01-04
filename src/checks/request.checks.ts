import type { SafeParseReturnType } from 'zod'
import { BadRequestError } from '@/lib/errors'
import { ERROR_CODES } from '@/constants/errors'

const ERROR_MSG_INVALID_QUERY_PARAMS = 'Invalid query parameters.'

/**
 * Asserts that Zod query parsing succeeded and narrows type to SafeParseSuccess
 */
function assertValidQueryParams<Input, Output>(
  result: SafeParseReturnType<Input, Output>
): asserts result is { success: true; data: Output } {
  if (!result.success) {
    throw new BadRequestError(
      ERROR_CODES.INVALID_REQUEST,
      ERROR_MSG_INVALID_QUERY_PARAMS
    )
  }
}

export { assertValidQueryParams }

