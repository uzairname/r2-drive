import { neon } from '@neondatabase/serverless'
import { drizzle } from 'drizzle-orm/neon-http'
import * as schema from './schema'

export function createDb(databaseUrl: string) {
  const sql = neon(databaseUrl)
  return drizzle(sql, { schema })
}

export type Database = ReturnType<typeof createDb>

// Re-export schema
export * from './schema'

// Re-export commonly used drizzle operators
export { and, desc, eq, gt, isNull, like, or, sql } from 'drizzle-orm'
