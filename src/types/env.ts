/**
 * Cloudflare Workers rate limiter binding interface
 */
interface WorkersRateLimiter {
  limit: (options: { key: string }) => Promise<{ success: boolean }>
}

/**
 * Worker environment bindings
 */
interface Bindings {
  DB: D1Database
  TURNSTILE_SECRET_KEY?: string
  INTERNAL_API_KEY?: string
  RATE_LIMITER?: WorkersRateLimiter
  ENVIRONMENT?: string
}

/**
 * Context variables passed between middleware and handlers
 */
interface Variables {
  requestId: string
  accessUserEmail: string | null
}

/**
 * Hono application environment definition
 */
interface AppEnvironment {
  Bindings: Bindings
  Variables: Variables
}

export type { WorkersRateLimiter, Bindings, Variables, AppEnvironment }

