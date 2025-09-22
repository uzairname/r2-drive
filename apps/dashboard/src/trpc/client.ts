import type { AppRouter } from '@r2-drive/api'
import { httpBatchLink } from '@trpc/client'
import { createTRPCReact } from '@trpc/react-query'

export const trpc = createTRPCReact<AppRouter>()

/**
 * Helper to create a TRPC client instance that can be used
 * outside React components (for example inside utility functions).
 */
export function createTRPCClient() {
  return trpc.createClient({
    links: [
      httpBatchLink({
        url: '/api/trpc',
      }),
    ],
  })
}

export const trpcClient = createTRPCClient()
