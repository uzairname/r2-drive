import { initTRPC, TRPCError } from '@trpc/server'
import { getCloudflareContext } from '@opennextjs/cloudflare'
import { Session } from 'next-auth'
import { isUserAdmin } from './auth'

export async function createContext({ session }: { session: Session | null }) {
  const { env } = getCloudflareContext()
  const isAdmin = isUserAdmin(session, env)

  return {
    session,
    env,
    isAdmin,
  }
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
