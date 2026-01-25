import { createDb, SharePermission, shareTokens } from '@r2-drive/db'
import { getCloudflareContext } from '@opennextjs/cloudflare'
import { initTRPC, TRPCError } from '@trpc/server'
import { and, eq, gt, isNull, or } from 'drizzle-orm'
import { Session } from 'next-auth'
import { isUserAdmin } from './auth'

export interface ValidatedToken {
  pathPrefix: string
  permission: SharePermission
}

export async function createContext({
  session,
  shareTokensHeader,
}: {
  session: Session | null
  shareTokensHeader?: string
}) {
  const { env } = getCloudflareContext()
  const isAdmin = isUserAdmin(session, env)

  // Parse and validate share tokens
  let validatedTokens: ValidatedToken[] = []

  if (shareTokensHeader && env.DATABASE_URL) {
    validatedTokens = await validateTokens(env.DATABASE_URL, shareTokensHeader)
  }

  return {
    session,
    env,
    isAdmin,
    shareTokens: validatedTokens,
  }
}

async function validateTokens(databaseUrl: string, tokenHeader: string): Promise<ValidatedToken[]> {
  const tokenIds = tokenHeader.split(',').map((t) => t.trim()).filter(Boolean)

  if (tokenIds.length === 0) {
    return []
  }

  const db = createDb(databaseUrl)
  const now = new Date()

  // Fetch all tokens and validate in one query
  const validTokens: ValidatedToken[] = []

  for (const tokenId of tokenIds) {
    const result = await db
      .select({
        pathPrefix: shareTokens.pathPrefix,
        permission: shareTokens.permission,
      })
      .from(shareTokens)
      .where(
        and(
          eq(shareTokens.id, tokenId),
          or(isNull(shareTokens.expiresAt), gt(shareTokens.expiresAt, now))
        )
      )
      .limit(1)

    if (result.length > 0 && result[0]) {
      validTokens.push({
        pathPrefix: result[0].pathPrefix,
        permission: result[0].permission as SharePermission,
      })
    }
  }

  return validTokens
}

export type Context = Awaited<ReturnType<typeof createContext>>

const t = initTRPC.context<Context>().create()

export const router = t.router
export const publicProcedure = t.procedure

/**
 * adminProcedure checks for a valid session and that the user email is listed in ADMIN_EMAILS.
 * It uses the isAdmin property from the context which is computed by isUserAdmin().
 */
export const adminProcedure = t.procedure.use(async ({ ctx, next }) => {
  if (!ctx.isAdmin) {
    throw new TRPCError({
      code: 'FORBIDDEN',
      message: 'Admin access required',
    })
  }

  return next()
})
