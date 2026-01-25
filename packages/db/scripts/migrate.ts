import { nonNullable } from '@r2-drive/utils'
import { config } from 'dotenv'
import { migrate } from 'drizzle-orm/neon-http/migrator'
import { createDb } from '../src'

const args = process.argv.slice(2)
const envPath = args.length === 1 ? args[0] : undefined
config({ path: envPath ?? '../../.env', override: true })

async function migrate_database(): Promise<void> {
  const databaseUrl = nonNullable(process.env.DATABASE_URL, 'DATABASE_URL')
  const db = createDb(databaseUrl)
  await migrate(db, { migrationsFolder: 'migrations' })
}

migrate_database()
  .then(() => {
    process.exit(0)
  })
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
