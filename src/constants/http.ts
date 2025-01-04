/**
 * HTTP header names, methods, and event names
 */
const HTTP_HEADERS = {
  CONTENT_TYPE: 'Content-Type',
  ORIGIN: 'Origin',
  AUTHORIZATION: 'Authorization',
  X_REQUEST_ID: 'X-Request-ID',
  CF_CONNECTING_IP: 'cf-connecting-ip',
  X_FORWARDED_FOR: 'x-forwarded-for',
  ACCESS_CONTROL_ALLOW_ORIGIN: 'Access-Control-Allow-Origin',
  ACCESS_CONTROL_ALLOW_METHODS: 'Access-Control-Allow-Methods',
  ACCESS_CONTROL_ALLOW_HEADERS: 'Access-Control-Allow-Headers',
  ACCESS_CONTROL_MAX_AGE: 'Access-Control-Max-Age',
} as const

const LOG_EVENTS = {
  MESSAGE_INGESTED: 'message_ingested',
  RATE_LIMIT_EXCEEDED: 'rate_limit_exceeded',
} as const

export { HTTP_HEADERS, LOG_EVENTS }

