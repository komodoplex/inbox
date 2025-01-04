import { BadRequestError } from '@/lib/errors'
import { ERROR_CODES } from '@/constants/errors'

const ERROR_MSG_INVALID_SUBMISSION = 'Invalid submission.'
const ERROR_MSG_TURNSTILE_REQUIRED = 'Turnstile token is required.'
const ERROR_MSG_TURNSTILE_UNCONFIGURED = 'Turnstile verification is unconfigured.'
const ERROR_MSG_TURNSTILE_FAILED = 'Turnstile token verification failed.'

/**
 * Asserts that the honeypot field is empty
 */
const assertNoHoneypot = (website?: string): void => {
  if (website) {
    throw new BadRequestError(
      ERROR_CODES.INVALID_REQUEST,
      ERROR_MSG_INVALID_SUBMISSION
    )
  }
}

/**
 * Asserts that Turnstile parameters are properly configured
 */
const assertTurnstileConfigured = (
  token: string,
  secretKey: string | undefined
): void => {
  if (!token) {
    throw new BadRequestError(
      ERROR_CODES.INVALID_TURNSTILE_TOKEN,
      ERROR_MSG_TURNSTILE_REQUIRED
    )
  }

  if (!secretKey) {
    throw new BadRequestError(
      ERROR_CODES.INVALID_TURNSTILE_TOKEN,
      ERROR_MSG_TURNSTILE_UNCONFIGURED
    )
  }
}

/**
 * Asserts that Turnstile token verification succeeded
 */
const assertTurnstileValid = (isValid: boolean): void => {
  if (!isValid) {
    throw new BadRequestError(
      ERROR_CODES.INVALID_TURNSTILE_TOKEN,
      ERROR_MSG_TURNSTILE_FAILED
    )
  }
}

export {
  assertNoHoneypot,
  assertTurnstileConfigured,
  assertTurnstileValid,
}

