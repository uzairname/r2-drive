import { PathUtils, PathSchema } from '@r2-drive/utils/path'
import { safeAsync } from '@r2-drive/utils/result'
import { TRPCError } from '@trpc/server'
import { z } from 'zod'
import { checkAccess } from '../../services/access-control'
import { publicProcedure } from '../../trpc'

export const createFolder = publicProcedure
  .input(
    z.object({
      baseFolder: PathSchema.refine((p) => p.isFolder, { message: 'baseFolder must be a folder' }),
      name: z
        .string()
        .refine((n) => !/[<>:"/\\|?*]/g.test(n), {
          message: 'Folder name contains invalid characters',
        })
        .refine((n) => n.trim().length > 0, { message: 'Folder name cannot be empty' }),
    })
  )
  .mutation(({ ctx, input }) =>
    safeAsync(async () => {
      const { baseFolder, name } = input

      // Check write permission on parent folder
      const access = checkAccess(ctx, baseFolder.key, 'write')
      if (!access.hasAccess) {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: 'No write access to this folder',
        })
      }

      const sanitizedName = name.trim()
      const folderKey = PathUtils.getChildFolder(baseFolder, sanitizedName).key
      await ctx.env.FILES.put(folderKey, null)
    })
  )
