import { auth } from '@/auth'
import { appRouter, createContext } from '@r2-drive/api'
import { fetchRequestHandler } from '@trpc/server/adapters/fetch'
import { cookies } from 'next/headers'

const TOKEN_COOKIE = 'r2-share-tokens'

const handler = async (req: Request) => {
  const session = await auth()

  // Read share tokens from cookie (set by middleware when visiting share links)
  const cookieStore = await cookies()
  const shareTokensFromCookie = cookieStore.get(TOKEN_COOKIE)?.value || undefined

  return fetchRequestHandler({
    endpoint: '/api/trpc',
    req,
    router: appRouter,
    createContext: () => createContext({ session, shareTokensHeader: shareTokensFromCookie }),
    onError: ({ path, error }) => {
      console.error(`tRPC error on ${path}:`, error)
    },
  })
}

export { handler as GET, handler as POST }
