import { auth } from '@/auth'
import { appRouter, createContext } from '@r2-drive/api'
import { fetchRequestHandler } from '@trpc/server/adapters/fetch'

const handler = async (req: Request) => {
  const session = await auth()

  return fetchRequestHandler({
    endpoint: '/api/trpc',
    req,
    router: appRouter,
    createContext: () => createContext({ session }),
  })
}

export { handler as GET, handler as POST }
