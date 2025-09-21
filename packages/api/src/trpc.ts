import { initTRPC, TRPCError } from '@trpc/server'
import { Context } from '.'

const t = initTRPC.context<Context>().create()

export const router = t.router
export const publicProcedure = t.procedure

/**
 * adminProcedure checks for a valid session and that the user email is listed in ADMIN_EMAILS.
 * It expects the Context to expose `session?.user?.email` and verifies presence.
 */
export const adminProcedure = t.procedure.use(async ({ ctx, next }) => {
  const isAdmin = !!ctx.session?.user?.isAdmin

  if (!isAdmin) {
    throw new TRPCError({
      code: 'FORBIDDEN',
      message: 'Admin access required',
    })
  }

  return next()
})
