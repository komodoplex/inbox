import { Kysely, type Compilable } from 'kysely'
import { D1Dialect } from 'kysely-d1'
import type { Database } from '@/db/schema'

/**
 * Instantiate a type-safe Kysely client for Cloudflare D1
 */
const createKyselyDb = (d1: D1Database): Kysely<Database> => {
  return new Kysely<Database>({
    dialect: new D1Dialect({ database: d1 }),
  })
}

/**
 * Execute multiple compiled Kysely queries atomically using Cloudflare D1 batch
 */
const executeKyselyBatch = async (
  d1: D1Database,
  queries: Array<Compilable<unknown>>
): Promise<void> => {
  const statements = queries.map((query) => {
    const compiled = query.compile()
    return d1.prepare(compiled.sql).bind(...compiled.parameters)
  })

  await d1.batch(statements)
}

export { createKyselyDb, executeKyselyBatch }

