import type { Kysely } from 'kysely'

export async function up(db: Kysely<unknown>): Promise<void> {
  await db.schema
    .createTable('ventures')
    .ifNotExists()
    .addColumn('id', 'text', (col) => col.primaryKey())
    .addColumn('slug', 'text', (col) => col.notNull().unique())
    .addColumn('name', 'text', (col) => col.notNull())
    .addColumn('enabled', 'integer', (col) => col.notNull().defaultTo(1))
    .addColumn('created_at', 'integer', (col) => col.notNull())
    .addColumn('updated_at', 'integer', (col) => col.notNull())
    .execute()

  await db.schema
    .createTable('sources')
    .ifNotExists()
    .addColumn('id', 'text', (col) => col.primaryKey())
    .addColumn('venture_id', 'text', (col) =>
      col.notNull().references('ventures.id').onDelete('cascade')
    )
    .addColumn('slug', 'text', (col) => col.notNull().unique())
    .addColumn('channel', 'text', (col) => col.notNull())
    .addColumn('domain', 'text', (col) => col.notNull())
    .addColumn('enabled', 'integer', (col) => col.notNull().defaultTo(1))
    .addColumn('created_at', 'integer', (col) => col.notNull())
    .addColumn('updated_at', 'integer', (col) => col.notNull())
    .execute()

  await db.schema
    .createTable('conversations')
    .ifNotExists()
    .addColumn('id', 'text', (col) => col.primaryKey())
    .addColumn('source_id', 'text', (col) =>
      col.notNull().references('sources.id').onDelete('restrict')
    )
    .addColumn('type', 'text', (col) => col.notNull().defaultTo('inquiry'))
    .addColumn('status', 'text', (col) => col.notNull().defaultTo('open'))
    .addColumn('subject', 'text')
    .addColumn('requester_name', 'text')
    .addColumn('requester_email', 'text')
    .addColumn('created_at', 'integer', (col) => col.notNull())
    .addColumn('updated_at', 'integer', (col) => col.notNull())
    .execute()

  await db.schema
    .createTable('messages')
    .ifNotExists()
    .addColumn('id', 'text', (col) => col.primaryKey())
    .addColumn('conversation_id', 'text', (col) =>
      col.notNull().references('conversations.id').onDelete('cascade')
    )
    .addColumn('direction', 'text', (col) => col.notNull())
    .addColumn('body', 'text', (col) => col.notNull())
    .addColumn('sender_name', 'text')
    .addColumn('sender_email', 'text')
    .addColumn('metadata', 'text')
    .addColumn('created_at', 'integer', (col) => col.notNull())
    .execute()

  await db.schema
    .createIndex('idx_conversations_source_id')
    .ifNotExists()
    .on('conversations')
    .column('source_id')
    .execute()

  await db.schema
    .createIndex('idx_conversations_status')
    .ifNotExists()
    .on('conversations')
    .column('status')
    .execute()

  await db.schema
    .createIndex('idx_conversations_updated_at')
    .ifNotExists()
    .on('conversations')
    .column('updated_at')
    .execute()

  await db.schema
    .createIndex('idx_messages_conversation_created')
    .ifNotExists()
    .on('messages')
    .columns(['conversation_id', 'created_at'])
    .execute()

  await db.schema
    .createIndex('idx_sources_venture_id')
    .ifNotExists()
    .on('sources')
    .column('venture_id')
    .execute()
}

export async function down(db: Kysely<unknown>): Promise<void> {
  await db.schema.dropTable('messages').ifExists().execute()
  await db.schema.dropTable('conversations').ifExists().execute()
  await db.schema.dropTable('sources').ifExists().execute()
  await db.schema.dropTable('ventures').ifExists().execute()
}
