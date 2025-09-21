import { Paths, PathSchema } from '@r2-drive/utils/path'
import { safeAsync } from '@r2-drive/utils/result'
import { z } from 'zod'
import { adminProcedure } from '../trpc'

export const createFolder = adminProcedure
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
  .mutation(({ ctx: { env }, input }) =>
    safeAsync(async () => {
      const { baseFolder, name } = input
      const sanitizedName = name.trim()
      const folderKey = Paths.getChildFolder(baseFolder, sanitizedName).key
      await env.FILES.put(folderKey, null)
    })
  )
