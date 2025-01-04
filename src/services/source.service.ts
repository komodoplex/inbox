import type { Kysely } from 'kysely'
import type { Database } from '@/db/schema'
import {
  getSourceBySlug,
  getAllSources,
  type SourceWithVenture,
} from '@/db/queries/sources'
import {
  assertSourceExists,
  assertSourceEnabled,
  assertValidIngestionType,
} from '@/checks'
import type { Source } from '@/types/domain'
import type { PublicMessageType } from '@/schemas/message.schema'
import {
  INGESTION_TYPES,
  SOURCE_SLUGS,
  ALLOWED_ORIGIN_DOMAINS,
} from '@/constants/sources'

interface IngestionTypeConfig {
  sourceSlug: string
  allowedDomains: string[]
}

const INGESTION_CONFIG: Record<PublicMessageType, IngestionTypeConfig> = {
  [INGESTION_TYPES.KOMODOPLEX_STUDIO]: {
    sourceSlug: SOURCE_SLUGS.KOMODOPLEX_STUDIO_TALK,
    allowedDomains: [ALLOWED_ORIGIN_DOMAINS.KOMODOPLEX],
  },
  [INGESTION_TYPES.KOMODOPLEX_HELLO]: {
    sourceSlug: SOURCE_SLUGS.KOMODOPLEX_HELLO,
    allowedDomains: [ALLOWED_ORIGIN_DOMAINS.KOMODOPLEX],
  },
  [INGESTION_TYPES.REPUTASK_FEEDS_SUBSCRIPTION]: {
    sourceSlug: SOURCE_SLUGS.REPUTASK_FEEDS,
    allowedDomains: [ALLOWED_ORIGIN_DOMAINS.REPUTASK],
  },
}

/**
 * Resolve and validate a source by its public slug
 */
const resolveSource = async (
  db: Kysely<Database>,
  slug: string
): Promise<Source> => {
  const source = await getSourceBySlug(db, slug)
  assertSourceExists(source)
  assertSourceEnabled(source)
  return source
}

/**
 * Resolve source record matching a typed public ingestion submission
 */
const getSourceForType = async (
  db: Kysely<Database>,
  type: PublicMessageType
): Promise<Source> => {
  const config = INGESTION_CONFIG[type]
  assertValidIngestionType(config)
  return resolveSource(db, config.sourceSlug)
}

/**
 * List all available sources
 */
const listAllSources = async (
  db: Kysely<Database>
): Promise<SourceWithVenture[]> => {
  return getAllSources(db)
}

export {
  INGESTION_CONFIG,
  resolveSource,
  getSourceForType,
  listAllSources,
}
export type { IngestionTypeConfig }

