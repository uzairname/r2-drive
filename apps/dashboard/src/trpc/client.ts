import { createTRPCReact } from '@trpc/react-query'
import type { AppRouter } from '@r2-drive/api'

export const trpc = createTRPCReact<AppRouter>()