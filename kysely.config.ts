import { existsSync, mkdirSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { SqliteDialect } from 'kysely'
import { defineConfig } from 'kysely-ctl'
import Database from 'better-sqlite3'
import { getNextMigrationPrefix } from './scripts/migration-utils'

const packageRoot = dirname(fileURLToPath(import.meta.url))
const migrationFolder = resolve(packageRoot, 'migrations')
const dataDir = resolve(packageRoot, '.data')

if (!existsSync(dataDir)) {
  mkdirSync(dataDir, { recursive: true })
}

const dbPath = process.env.DATABASE_URL || resolve(dataDir, 'local.sqlite')

export default defineConfig({
  dialect: new SqliteDialect({
    database: new Database(dbPath),
  }),
  migrations: {
    migrationFolder: 'migrations',
    getMigrationPrefix: () => getNextMigrationPrefix(migrationFolder),
  },
})
