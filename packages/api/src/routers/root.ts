import { router } from '../trpc'
import { r2Router } from './r2/r2-router'

export const appRouter = router({
  r2: r2Router,
})

export type AppRouter = typeof appRouter
