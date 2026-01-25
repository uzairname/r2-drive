import { router } from '../trpc'
import { r2Router } from './r2/r2-router'
import { sharingRouter } from './sharing'

export const appRouter = router({
  r2: r2Router,
  sharing: sharingRouter,
})

export type AppRouter = typeof appRouter
