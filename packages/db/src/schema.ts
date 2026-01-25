// Drizzle ORM schema for Neon PostgreSQL
import { integer, pgTable, text, timestamp } from 'drizzle-orm/pg-core'

export const shareTokens = pgTable('share_tokens', {
  id: text('id').primaryKey(), // 32-byte random token (base64url)
  pathPrefix: text('path_prefix').notNull(), // "" = root, "photos/" = photos folder
  permission: text('permission', { enum: ['read', 'write'] }).notNull(),
  label: text('label'), // Optional description
  createdAt: timestamp('created_at', { withTimezone: true }).notNull(),
  expiresAt: timestamp('expires_at', { withTimezone: true }), // null = never
  accessCount: integer('access_count').notNull().default(0),
  lastAccessedAt: timestamp('last_accessed_at', { withTimezone: true }),
})

export type ShareToken = typeof shareTokens.$inferSelect
export type InsertShareToken = typeof shareTokens.$inferInsert
export type SharePermission = 'read' | 'write'
