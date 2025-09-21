import { createTRPCReact } from '@trpc/react-query'
import type { AppRouter } from '@workspace/api'

export const trpc = createTRPCReact<AppRouter>()
