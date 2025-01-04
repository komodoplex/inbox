import { NotFoundError } from '@/lib/errors'
import { ERROR_CODES } from '@/constants/errors'

const ERROR_MSG_CONVERSATION_NOT_FOUND = 'Conversation not found.'

/**
 * Asserts that a conversation entity exists
 */
function assertConversationExists<T>(
  conversation: T | null | undefined
): asserts conversation is T {
  if (!conversation) {
    throw new NotFoundError(
      ERROR_CODES.CONVERSATION_NOT_FOUND,
      ERROR_MSG_CONVERSATION_NOT_FOUND
    )
  }
}

/**
 * Asserts that a conversation update operation modified at least one record
 */
const assertConversationUpdated = (success: boolean): void => {
  if (!success) {
    throw new NotFoundError(
      ERROR_CODES.CONVERSATION_NOT_FOUND,
      ERROR_MSG_CONVERSATION_NOT_FOUND
    )
  }
}

export { assertConversationExists, assertConversationUpdated }

