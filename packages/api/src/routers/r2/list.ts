import { PathSchema } from '@r2-drive/utils/path'
import z from 'zod'
import { filterAccessibleItems, hasAnyAccess } from '../../services/access-control'
import { listDisplayableItemsInFolder } from '../../services/r2'
import { publicProcedure } from '../../trpc'

export const list = publicProcedure
  .input(z.object({ folder: PathSchema }))
  .query(async ({ ctx, input: { folder } }) => {
    // Check if user has any access to this folder
    console.log(`share tokens: `, ctx.shareTokens)

    if (!hasAnyAccess(ctx, folder.key)) {
      return { success: true, data: { files: [], folders: [], bucketName: ctx.env.R2_BUCKET_NAME } }
    }

    const result = await listDisplayableItemsInFolder(ctx.env, folder)

    // If it failed, return the result as-is
    if (!result.success) {
      return result
    }
    
    // Filter items based on access control
    const filteredFiles = filterAccessibleItems(
      ctx,
      result.data.files.map((item) => ({ ...item, key: item.path.key }))
    )
    const filteredFolders = filterAccessibleItems(
      ctx,
      result.data.folders.map((item) => ({ ...item, key: item.path.key }))
    )

    return {
      success: true,
      data: {
        files: filteredFiles,
        folders: filteredFolders,
        bucketName: result.data.bucketName,
      },
    }
  })
