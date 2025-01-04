import { ERROR_CODES } from '@/constants/errors'

/**
 * Application domain error classes with standard codes and HTTP statuses
 */

class AppError extends Error {
  public readonly code: string
  public readonly statusCode: number

  constructor(code: string, message: string, statusCode: number = 400) {
    super(message)
    this.name = 'AppError'
    this.code = code
    this.statusCode = statusCode
  }
}

class NotFoundError extends AppError {
  constructor(
    code: string = ERROR_CODES.SOURCE_NOT_FOUND,
    message: string = 'Source not found.'
  ) {
    super(code, message, 404)
    this.name = 'NotFoundError'
  }
}

class BadRequestError extends AppError {
  constructor(
    code: string = ERROR_CODES.INVALID_REQUEST,
    message: string = 'Invalid request.'
  ) {
    super(code, message, 400)
    this.name = 'BadRequestError'
  }
}

class ForbiddenError extends AppError {
  constructor(
    code: string = ERROR_CODES.FORBIDDEN,
    message: string = 'Forbidden access.'
  ) {
    super(code, message, 403)
    this.name = 'ForbiddenError'
  }
}

class RateLimitError extends AppError {
  constructor(
    code: string = ERROR_CODES.RATE_LIMITED,
    message: string = 'Too many requests.'
  ) {
    super(code, message, 429)
    this.name = 'RateLimitError'
  }
}

export {
  AppError,
  NotFoundError,
  BadRequestError,
  ForbiddenError,
  RateLimitError,
}

