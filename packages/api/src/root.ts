import { router } from './trpc';
import { download } from './routers/download';

export const appRouter = router({
  download,
});

export type AppRouter = typeof appRouter;