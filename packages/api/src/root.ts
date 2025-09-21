import { router } from './trpc';
import { download } from './routers/download';
import { upload } from './routers/upload';

export const appRouter = router({
  download,
  upload,
});

export type AppRouter = typeof appRouter;