import fs from 'node:fs'
import path from 'node:path'

const configPath = path.resolve(process.cwd(), 'wrangler.jsonc')

if (fs.existsSync(configPath)) {
  let content = fs.readFileSync(configPath, 'utf-8')
  let modified = false

  const dbId = process.env.D1_DATABASE_ID || process.env.CLOUDFLARE_D1_DATABASE_ID
  if (dbId) {
    content = content.replace(
      /"database_id":\s*"[^"]*"/g,
      `"database_id": "${dbId}"`
    )
    modified = true
  }

  const dbName = process.env.D1_DATABASE_NAME
  if (dbName) {
    content = content.replace(
      /"database_name":\s*"[^"]*"/g,
      `"database_name": "${dbName}"`
    )
    modified = true
  }

  if (modified) {
    fs.writeFileSync(configPath, content, 'utf-8')
    console.log('[CI] wrangler.jsonc dynamically updated with pipeline environment variables.')
  }
}
