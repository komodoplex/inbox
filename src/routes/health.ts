import { Hono } from 'hono'
import { sql } from 'kysely'
import { createKyselyDb } from '@/db/client'
import { HttpHelper } from '@/helpers'
import type { AppEnvironment } from '@/types/env'

const DB_UNREACHABLE_ERROR = 'Database unreachable'

const healthRouter = new Hono<AppEnvironment>()

/**
 * Health check endpoint
 */
healthRouter.get('/', async (c) => {
  try {
    if (c.env.DB) {
      const db = createKyselyDb(c.env.DB)
      await sql`SELECT 1`.execute(db)
    }
    return HttpHelper.response(c, { ok: true })
  } catch {
    return HttpHelper.response(
      c,
      { ok: false, error: DB_UNREACHABLE_ERROR },
      503
    )
  }
})

export { healthRouter }


