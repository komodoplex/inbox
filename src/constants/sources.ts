/**
 * Ingestion type constants and source identifiers
 */
const INGESTION_TYPES = {
  KOMODOPLEX_STUDIO: 'KOMODOPLEX_STUDIO',
  KOMODOPLEX_HELLO: 'KOMODOPLEX_HELLO',
  REPUTASK_FEEDS_SUBSCRIPTION: 'REPUTASK_FEEDS_SUBSCRIPTION',
} as const

type IngestionType = (typeof INGESTION_TYPES)[keyof typeof INGESTION_TYPES]

const SOURCE_SLUGS = {
  KOMODOPLEX_STUDIO_TALK: 'komodoplex-studio-talk',
  KOMODOPLEX_HELLO: 'komodoplex-hello',
  REPUTASK_FEEDS: 'reputask-feeds',
} as const

type SourceSlug = (typeof SOURCE_SLUGS)[keyof typeof SOURCE_SLUGS]

const ALLOWED_ORIGIN_DOMAINS = {
  KOMODOPLEX: 'komodoplex.com',
  REPUTASK: 'reputask.xyz',
} as const

const DEFAULT_SUBJECTS = {
  STUDIO: 'Studio Project Inquiry',
  HELLO: 'General Contact / Hello',
  FEEDS: 'Feeds & Early Access Subscription',
} as const

export {
  INGESTION_TYPES,
  SOURCE_SLUGS,
  ALLOWED_ORIGIN_DOMAINS,
  DEFAULT_SUBJECTS,
}
export type { IngestionType, SourceSlug }

