import type { Kysely } from 'kysely'

interface MigrationVentures {
  id: string
  slug: string
  name: string
  enabled: number
  created_at: number
  updated_at: number
}

interface MigrationSources {
  id: string
  venture_id: string
  slug: string
  channel: string
  domain: string
  enabled: number
  created_at: number
  updated_at: number
}

interface MigrationDatabase {
  ventures: MigrationVentures
  sources: MigrationSources
}

export async function up(db: Kysely<unknown>): Promise<void> {
  const typedDb = db as unknown as Kysely<MigrationDatabase>

  await typedDb
    .insertInto('ventures')
    .values([
      {
        id: 'vtr_komodoplex',
        slug: 'komodoplex',
        name: 'Komodoplex',
        enabled: 1,
        created_at: 1774000000000,
        updated_at: 1774000000000,
      },
      {
        id: 'vtr_reputask',
        slug: 'reputask',
        name: 'Reputask',
        enabled: 1,
        created_at: 1774000000000,
        updated_at: 1774000000000,
      },
    ])
    .onConflict((oc) => oc.doNothing())
    .execute()

  await typedDb
    .insertInto('sources')
    .values([
      {
        id: 'src_komodoplex_talk',
        venture_id: 'vtr_komodoplex',
        slug: 'komodoplex-studio-talk',
        channel: 'talk',
        domain: 'komodoplex.com',
        enabled: 1,
        created_at: 1774000000000,
        updated_at: 1774000000000,
      },
      {
        id: 'src_komodoplex_hello',
        venture_id: 'vtr_komodoplex',
        slug: 'komodoplex-hello',
        channel: 'hello',
        domain: 'komodoplex.com',
        enabled: 1,
        created_at: 1774000000000,
        updated_at: 1774000000000,
      },
      {
        id: 'src_komodoplex_support',
        venture_id: 'vtr_komodoplex',
        slug: 'komodoplex-support',
        channel: 'support',
        domain: 'komodoplex.com',
        enabled: 1,
        created_at: 1774000000000,
        updated_at: 1774000000000,
      },
      {
        id: 'src_reputask_contact',
        venture_id: 'vtr_reputask',
        slug: 'reputask-contact',
        channel: 'contact',
        domain: 'reputask.xyz',
        enabled: 1,
        created_at: 1774000000000,
        updated_at: 1774000000000,
      },
      {
        id: 'src_reputask_feeds',
        venture_id: 'vtr_reputask',
        slug: 'reputask-feeds',
        channel: 'feeds',
        domain: 'reputask.xyz',
        enabled: 1,
        created_at: 1774000000000,
        updated_at: 1774000000000,
      },
    ])
    .onConflict((oc) => oc.doNothing())
    .execute()
}

export async function down(db: Kysely<unknown>): Promise<void> {
  const typedDb = db as unknown as Kysely<MigrationDatabase>

  await typedDb
    .deleteFrom('sources')
    .where('id', 'in', [
      'src_komodoplex_talk',
      'src_komodoplex_hello',
      'src_komodoplex_support',
      'src_reputask_contact',
      'src_reputask_feeds',
    ])
    .execute()

  await typedDb
    .deleteFrom('ventures')
    .where('id', 'in', ['vtr_komodoplex', 'vtr_reputask'])
    .execute()
}
