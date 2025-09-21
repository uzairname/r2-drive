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
