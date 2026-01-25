import { router } from '../../trpc'
import { bucketInfo } from './bucket-info'
import { createFolder } from './create-folder'
import { deleteObjects } from './delete'
import { download } from './download'
import { list } from './list'
import { renameObject } from './rename'
import { uploadRouter } from './upload'

export const r2Router = router({
  bucketInfo,
  createFolder,
  deleteObjects,
  download,
  upload: uploadRouter,
  list,
  renameObject,
})
