import { DatabaseSync } from 'node:sqlite'
import path from 'node:path'
import { createKyselyDb } from '@/db/client'
import { assertValidMigrationFiles } from '../../scripts/migration-utils'

interface MigrationModule {
  up: (db: unknown) => Promise<void>
  down?: (db: unknown) => Promise<void>
}

export interface MockD1Meta {
  changes: number
  last_row_id: number
  duration: number
}

export interface MockD1PreparedStatement {
  bind(...values: unknown[]): MockD1PreparedStatement
  first<T = unknown>(colName?: string): Promise<T | null>
  all<T = unknown>(): Promise<{ results: T[]; success: boolean; meta: MockD1Meta }>
  run(): Promise<{ success: boolean; meta: MockD1Meta }>
}

export type SQLiteBindValue = null | number | bigint | string | Uint8Array

const toSqliteValue = (val: unknown): SQLiteBindValue => {
  if (val === undefined || val === null) {
    return null
  }
  if (
    typeof val === 'number' ||
    typeof val === 'bigint' ||
    typeof val === 'string' ||
    val instanceof Uint8Array
  ) {
    return val
  }
  return String(val)
}

export class MockD1Database {
  private readonly db: DatabaseSync

  constructor() {
    this.db = new DatabaseSync(':memory:')
  }

  public prepare(query: string): MockD1PreparedStatement {
    let boundValues: SQLiteBindValue[] = []
    const sqliteDb = this.db

    const stmtObj: MockD1PreparedStatement = {
      bind(...values: unknown[]): MockD1PreparedStatement {
        boundValues = values.map(toSqliteValue)
        return stmtObj
      },
      async first<T = unknown>(colName?: string): Promise<T | null> {
        const stmt = sqliteDb.prepare(query)
        const row = stmt.get(...boundValues) as Record<string, unknown> | undefined
        if (!row) {
          return null
        }
        if (colName) {
          return (row[colName] as T) ?? null
        }
        return row as T
      },
      async all<T = unknown>(): Promise<{
        results: T[]
        success: boolean
        meta: MockD1Meta
      }> {
        const stmt = sqliteDb.prepare(query)
        const trimmed = query.trim().toUpperCase()
        const isSelect =
          trimmed.startsWith('SELECT') ||
          trimmed.startsWith('WITH') ||
          trimmed.startsWith('PRAGMA')

        if (isSelect) {
          const rows = stmt.all(...boundValues) as T[]
          return {
            results: rows,
            success: true,
            meta: { changes: 0, last_row_id: 0, duration: 0 },
          }
        }

        const info = stmt.run(...boundValues)
        return {
          results: [],
          success: true,
          meta: {
            changes: Number(info.changes),
            last_row_id: Number(info.lastInsertRowid),
            duration: 0,
          },
        }
      },
      async run(): Promise<{ success: boolean; meta: MockD1Meta }> {
        const stmt = sqliteDb.prepare(query)
        const info = stmt.run(...boundValues)
        return {
          success: true,
          meta: {
            changes: Number(info.changes),
            last_row_id: Number(info.lastInsertRowid),
            duration: 0,
          },
        }
      },
    }

    return stmtObj
  }

  public async batch<T = unknown>(
    statements: MockD1PreparedStatement[]
  ): Promise<Array<{ success: boolean; results?: T[] }>> {
    this.db.exec('BEGIN TRANSACTION')
    try {
      const results: Array<{ success: boolean; results?: T[] }> = []
      for (const statement of statements) {
        const res = await statement.run()
        results.push(res)
      }
      this.db.exec('COMMIT')
      return results
    } catch (err) {
      this.db.exec('ROLLBACK')
      throw err
    }
  }

  public async exec(query: string): Promise<{ count: number; duration: number }> {
    this.db.exec(query)
    return { count: 1, duration: 0 }
  }
}


/**
 * Factory creating a fresh test database with all migrations applied
 */
export const createTestDatabase = async (): Promise<D1Database> => {
  const mock = new MockD1Database()
  const d1 = mock as unknown as D1Database
  const kysely = createKyselyDb(d1)
  const migrationsDir = path.resolve(__dirname, '../../migrations')
  const validFiles = assertValidMigrationFiles(migrationsDir)

  for (const file of validFiles) {
    const migration = (await import(path.resolve(migrationsDir, file))) as MigrationModule
    await migration.up(kysely)
  }

  return d1
}
