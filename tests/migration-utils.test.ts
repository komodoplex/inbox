import { describe, it, expect } from 'vitest'
import path from 'node:path'
import fs from 'node:fs'
import os from 'node:os'
import {
  assertValidMigrationFiles,
  assertValidMigrationName,
  getNextMigrationPrefix,
} from '../scripts/migration-utils'

describe('Migration Utilities', () => {
  describe('assertValidMigrationName', () => {
    it('accepts valid migration names', () => {
      expect(() => assertValidMigrationName('init')).not.toThrow()
      expect(() => assertValidMigrationName('add_users_table')).not.toThrow()
      expect(() => assertValidMigrationName('seed-sources-v2')).not.toThrow()
    })

    it('rejects invalid migration names', () => {
      expect(() => assertValidMigrationName('')).toThrow()
      expect(() => assertValidMigrationName('InitUpper')).toThrow()
      expect(() => assertValidMigrationName('has space')).toThrow()
      expect(() => assertValidMigrationName('_leading_underscore')).toThrow()
      expect(() => assertValidMigrationName('-leading-hyphen')).toThrow()
    })
  })

  describe('getNextMigrationPrefix & assertValidMigrationFiles', () => {
    it('returns 001_ when migration folder is empty', () => {
      const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'mig-test-'))
      try {
        expect(getNextMigrationPrefix(tempDir)).toBe('001_')
      } finally {
        fs.rmSync(tempDir, { recursive: true, force: true })
      }
    })

    it('computes contiguous next prefix correctly', () => {
      const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'mig-test-'))
      try {
        fs.writeFileSync(path.join(tempDir, '001_init.ts'), '')
        fs.writeFileSync(path.join(tempDir, '002_seed.ts'), '')
        expect(getNextMigrationPrefix(tempDir)).toBe('003_')
      } finally {
        fs.rmSync(tempDir, { recursive: true, force: true })
      }
    })

    it('throws when migration sequence has gaps', () => {
      const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'mig-test-'))
      try {
        fs.writeFileSync(path.join(tempDir, '001_init.ts'), '')
        fs.writeFileSync(path.join(tempDir, '003_skipped.ts'), '')
        expect(() => assertValidMigrationFiles(tempDir)).toThrow(
          /Migration sequence must stay contiguous/
        )
      } finally {
        fs.rmSync(tempDir, { recursive: true, force: true })
      }
    })

    it('throws when migration file name is invalid', () => {
      const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'mig-test-'))
      try {
        fs.writeFileSync(path.join(tempDir, 'invalid_name.ts'), '')
        expect(() => assertValidMigrationFiles(tempDir)).toThrow(
          /Migration files must match/
        )
      } finally {
        fs.rmSync(tempDir, { recursive: true, force: true })
      }
    })
  })
})
