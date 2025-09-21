import { bucket } from './routers/bucket'
import { createFolder } from './routers/create-folder'
import { deleteObjects } from './routers/delete'
import { download } from './routers/download'
import { list } from './routers/list'
import { upload } from './routers/upload'
import { router } from './trpc'

export const appRouter = router({
  bucket,
  upload,
  download,
  deleteObjects,
  createFolder,
  list,
})

export type AppRouter = typeof appRouter
