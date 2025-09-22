import { router } from '../../trpc'
import { createFolder } from './create-folder'
import { deleteObjects } from './delete'
import { download } from './download'
import { list } from './list'
import { uploadRouter } from './upload'

export const r2Router = router({
  createFolder,
  deleteObjects,
  download,
  upload: uploadRouter,
  list,
})
