import { RateLimitError } from '@/lib/errors'
import { ERROR_CODES } from '@/constants/errors'
import type { Bindings } from '@/types/env'

interface InMemoryBucket {
  count: number
  resetAt: number
}

const memoryStore = new Map<string, InMemoryBucket>()
const WINDOW_MS = 60 * 1000
const MAX_REQUESTS = 5
const MAX_STORE_ENTRIES = 5000

/**
 * Clean up expired entries in the memory store and enforce entry cap
 */
const cleanupStore = (now: number): void => {
  for (const [key, bucket] of memoryStore.entries()) {
    if (bucket.resetAt <= now) {
      memoryStore.delete(key)
    }
  }

  if (memoryStore.size >= MAX_STORE_ENTRIES) {
    const excess = memoryStore.size - MAX_STORE_ENTRIES
    let count = 0
    for (const key of memoryStore.keys()) {
      if (count++ >= excess) {
        break
      }
      memoryStore.delete(key)
    }
  }
}

/**
 * Check rate limit using Cloudflare Rate Limiter binding or in-memory fallback
 */
const checkRateLimit = async (
  bindings: Bindings,
  key: string
): Promise<void> => {
  if (bindings.RATE_LIMITER) {
    const result = await bindings.RATE_LIMITER.limit({ key })
    if (!result.success) {
      throw new RateLimitError(ERROR_CODES.RATE_LIMITED, 'Too many requests.')
    }
    return
  }

  const now = Date.now()
  cleanupStore(now)

  const bucket = memoryStore.get(key)
  if (!bucket || bucket.resetAt <= now) {
    memoryStore.set(key, { count: 1, resetAt: now + WINDOW_MS })
    return
  }

  if (bucket.count >= MAX_REQUESTS) {
    throw new RateLimitError(ERROR_CODES.RATE_LIMITED, 'Too many requests.')
  }

  bucket.count += 1
}

/**
 * Reset memory store (used for test isolation)
 */
const resetRateLimitStore = (): void => {
  memoryStore.clear()
}

export { checkRateLimit, resetRateLimitStore }

