import { createDb, desc, eq, SharePermission, shareTokens, and, or, isNull, gt } from '@r2-drive/db'
import { PathUtils } from '@r2-drive/utils'
import { TRPCError } from '@trpc/server'
import { z } from 'zod'
import { adminProcedure, publicProcedure, router } from '../../trpc'

function generateToken(): string {
  const bytes = new Uint8Array(32)
  crypto.getRandomValues(bytes)
  // Base64url encode
  return btoa(String.fromCharCode(...bytes))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=/g, '')
}

export const sharingRouter = router({
  // Create a new share token (admin only)
  create: adminProcedure
    .input(
      z.object({
        pathPrefix: z
          .string()
          .default('')
          .superRefine((val, ctx) => {
            const error = PathUtils.validateKey(val)
            if (error) {
              ctx.addIssue({
                code: "custom",
                message: error,
              })
            }
          }),
        permission: z.enum(['read', 'write']),
        label: z.string().optional(),
        expiresIn: z.number().optional(), // milliseconds from now, null = never
      })
    )
    .mutation(async ({ ctx, input }) => {
      if (!ctx.env.DATABASE_URL) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Database not configured',
        })
      }

      const db = createDb(ctx.env.DATABASE_URL)
      const token = generateToken()
      const now = new Date()

      const expiresAt = input.expiresIn ? new Date(now.getTime() + input.expiresIn) : null

      await db.insert(shareTokens).values({
        id: token,
        pathPrefix: input.pathPrefix,
        permission: input.permission,
        label: input.label || null,
        createdAt: now,
        expiresAt,
        accessCount: 0,
      })

      return { token }
    }),

  // List all share tokens (admin only)
  list: adminProcedure.query(async ({ ctx }) => {
    if (!ctx.env.DATABASE_URL) {
      throw new TRPCError({
        code: 'INTERNAL_SERVER_ERROR',
        message: 'Database not configured',
      })
    }

    const db = createDb(ctx.env.DATABASE_URL)

    const tokens = await db
      .select()
      .from(shareTokens)
      .orderBy(desc(shareTokens.createdAt))

    return tokens.map((t) => ({
      id: t.id,
      pathPrefix: t.pathPrefix,
      permission: t.permission as SharePermission,
      label: t.label,
      createdAt: t.createdAt,
      expiresAt: t.expiresAt,
      accessCount: t.accessCount,
      lastAccessedAt: t.lastAccessedAt,
      isExpired: t.expiresAt ? t.expiresAt <= new Date() : false,
    }))
  }),

  // Delete/revoke a share token (admin only)
  delete: adminProcedure
    .input(z.object({ tokenId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      if (!ctx.env.DATABASE_URL) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Database not configured',
        })
      }

      const db = createDb(ctx.env.DATABASE_URL)

      const result = await db
        .delete(shareTokens)
        .where(eq(shareTokens.id, input.tokenId))
        .returning({ id: shareTokens.id })

      if (result.length === 0) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Token not found',
        })
      }

      return { success: true }
    }),

  // Validate tokens and return current access (public)
  validate: publicProcedure.query(async ({ ctx }) => {
    // Return the validated tokens from context
    const tokens = ctx.shareTokens || []

    return {
      isAdmin: ctx.isAdmin,
      tokens: tokens.map((t) => ({
        pathPrefix: t.pathPrefix,
        permission: t.permission,
      })),
    }
  }),

  // Get the path prefix for a specific token (public, used for redirect after sharing)
  getTokenPath: publicProcedure
    .input(z.object({ tokenId: z.string() }))
    .query(async ({ ctx, input }) => {
      if (!ctx.env.DATABASE_URL) {
        return { pathPrefix: null, isFile: false }
      }

      const db = createDb(ctx.env.DATABASE_URL)
      const now = new Date()

      const result = await db
        .select({ pathPrefix: shareTokens.pathPrefix })
        .from(shareTokens)
        .where(
          and(
            eq(shareTokens.id, input.tokenId),
            or(isNull(shareTokens.expiresAt), gt(shareTokens.expiresAt, now))
          )
        )
        .limit(1)

      if (result.length === 0 || !result[0]) {
        return { pathPrefix: null, isFile: false }
      }

      const pathPrefix = result[0].pathPrefix
      const isFile = !PathUtils.isFolder(pathPrefix)

      return { pathPrefix, isFile }
    }),
})
