import { existsSync, readdirSync } from 'node:fs'
import { extname } from 'node:path'

const MIGRATION_FILE_REGEX =
  /^(?<prefix>\d{3})_(?<name>[a-z0-9][a-z0-9_-]*)\.(?<ext>ts|mts|cts|js|mjs|cjs)$/
const MIGRATION_NAME_REGEX = /^[a-z0-9][a-z0-9_-]*$/
const SUPPORTED_MIGRATION_EXTENSIONS = new Set(['.ts', '.mts', '.cts', '.js', '.mjs', '.cjs'])

const MIGRATION_NUMBER_WIDTH = 3
const MAX_MIGRATION_NUMBER = 99999

const formatMigrationNumber = (value: number): string =>
  value.toString().padStart(MIGRATION_NUMBER_WIDTH, '0')

const getMigrationFiles = (migrationFolder: string): string[] => {
  if (!existsSync(migrationFolder)) {
    return []
  }

  return readdirSync(migrationFolder, { withFileTypes: true })
    .filter((entry) => entry.isFile())
    .map((entry) => entry.name)
}

const assertValidMigrationFiles = (migrationFolder: string): string[] => {
  const files = getMigrationFiles(migrationFolder)
  const invalidFiles = files.filter((file) => {
    const extension = extname(file)
    return SUPPORTED_MIGRATION_EXTENSIONS.has(extension) && !MIGRATION_FILE_REGEX.test(file)
  })

  if (invalidFiles.length > 0) {
    throw new Error(
      `Migration files must match ${formatMigrationNumber(1)}_name.ts. Invalid files: ${invalidFiles.join(', ')}`
    )
  }

  const validFiles = files.filter((file) => MIGRATION_FILE_REGEX.test(file)).sort()
  const migrationNumbers = validFiles.map((file) =>
    Number(MIGRATION_FILE_REGEX.exec(file)?.groups?.prefix)
  )

  for (const [index, migrationNumber] of migrationNumbers.entries()) {
    const expected = index + 1
    if (migrationNumber !== expected) {
      throw new Error(
        `Migration sequence must stay contiguous. Expected ${formatMigrationNumber(expected)} but found ${formatMigrationNumber(migrationNumber)} in ${validFiles[index]}.`
      )
    }
  }

  return validFiles
}

const assertValidMigrationName = (name: string): void => {
  if (!MIGRATION_NAME_REGEX.test(name)) {
    throw new Error(
      'Migration name must use lowercase letters, numbers, underscores, or hyphens, and must start with a letter or number.'
    )
  }
}

const getNextMigrationPrefix = (migrationFolder: string): string => {
  const validFiles = assertValidMigrationFiles(migrationFolder)
  const nextMigrationNumber = validFiles.length + 1

  if (nextMigrationNumber > MAX_MIGRATION_NUMBER) {
    throw new Error(
      `Migration limit reached. Maximum supported migration number is ${MAX_MIGRATION_NUMBER}.`
    )
  }

  return `${formatMigrationNumber(nextMigrationNumber)}_`
}

export { assertValidMigrationFiles, assertValidMigrationName, getNextMigrationPrefix }
