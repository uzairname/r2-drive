import { PathSchema } from '@r2-drive/utils/path'
import { z } from 'zod'
import { filterAccessibleItems, hasAnyAccess } from '../../services/access-control'
import { listAllFilesInFolder } from '../../services/r2'
import { publicProcedure } from '../../trpc'

/**
 * List all files recursively within a folder.
 * Used for folder downloads where we need all nested files with their sizes.
 */
export const listRecursive = publicProcedure
  .input(z.object({ folder: PathSchema }))
  .query(async ({ ctx, input: { folder } }) => {
    // Check if user has any access to this folder
    if (!hasAnyAccess(ctx, folder.key)) {
      return { success: true, data: { files: [] } }
    }

    const files = await listAllFilesInFolder(ctx.env, folder)

    // Filter files based on access control
    const filteredFiles = filterAccessibleItems(
      ctx,
      files.map((f) => ({ ...f, key: f.key }))
    )

    return {
      success: true,
      data: {
        files: filteredFiles,
      },
    }
  })
