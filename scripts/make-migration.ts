import { spawn } from 'node:child_process'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { assertValidMigrationName, getNextMigrationPrefix } from './migration-utils'

const scriptsDir = dirname(fileURLToPath(import.meta.url))
const packageRoot = resolve(scriptsDir, '..')
const migrationFolder = resolve(packageRoot, 'migrations')

const migrationName = process.argv[2]?.trim()
const passthroughArgs = process.argv.slice(3)

if (!migrationName) {
  console.error('Usage: pnpm run db:migrate:make <migration_name>')
  process.exit(1)
}

try {
  assertValidMigrationName(migrationName)
  const nextFilename = `${getNextMigrationPrefix(migrationFolder)}${migrationName}.ts`
  console.info(`[migration] creating ${nextFilename}`)
} catch (error) {
  console.error(error instanceof Error ? error.message : String(error))
  process.exit(1)
}

const child = spawn(
  'pnpm',
  ['run', 'db:make:raw', '--', migrationName, ...passthroughArgs],
  {
    cwd: packageRoot,
    stdio: 'inherit',
  }
)

child.on('exit', (code) => {
  process.exit(code ?? 0)
})
