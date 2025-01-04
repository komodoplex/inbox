import type { Kysely } from 'kysely'
import type { Database } from '@/db/schema'
import { DB_TABLES, SORT_ORDERS } from '@/constants/database'
import type { Source } from '@/types/domain'

interface SourceWithVenture extends Source {
  venture_name: string
  venture_slug: string
}

/**
 * Retrieve a source by its unique public slug
 */
const getSourceBySlug = async (
  db: Kysely<Database>,
  slug: string
): Promise<Source | null> => {
  const result = await db
    .selectFrom(DB_TABLES.SOURCES)
    .selectAll()
    .where('slug', '=', slug)
    .executeTakeFirst()

  return result ?? null
}

/**
 * Retrieve all registered sources with venture metadata
 */
const getAllSources = async (
  db: Kysely<Database>
): Promise<SourceWithVenture[]> => {
  return await db
    .selectFrom(DB_TABLES.SOURCES)
    .innerJoin(
      DB_TABLES.VENTURES,
      `${DB_TABLES.VENTURES}.id`,
      `${DB_TABLES.SOURCES}.venture_id`
    )
    .select([
      `${DB_TABLES.SOURCES}.id`,
      `${DB_TABLES.SOURCES}.venture_id`,
      `${DB_TABLES.SOURCES}.slug`,
      `${DB_TABLES.SOURCES}.channel`,
      `${DB_TABLES.SOURCES}.domain`,
      `${DB_TABLES.SOURCES}.enabled`,
      `${DB_TABLES.SOURCES}.created_at`,
      `${DB_TABLES.SOURCES}.updated_at`,
      `${DB_TABLES.VENTURES}.name as venture_name`,
      `${DB_TABLES.VENTURES}.slug as venture_slug`,
    ])
    .orderBy(`${DB_TABLES.VENTURES}.name`, SORT_ORDERS.ASC)
    .orderBy(`${DB_TABLES.SOURCES}.slug`, SORT_ORDERS.ASC)
    .execute()
}

export { getSourceBySlug, getAllSources }
export type { SourceWithVenture }

