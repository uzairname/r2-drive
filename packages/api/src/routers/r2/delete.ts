import { PathSchema } from '@r2-drive/utils'
import { safeAsync } from '@r2-drive/utils/result'
import { z } from 'zod'
import { listAllKeysInFolder } from '../../services/r2'
import { adminProcedure } from '../../trpc'

export const deleteObjects = adminProcedure
  .input(z.array(PathSchema))
  .mutation(async ({ ctx: { env }, input }) =>
    safeAsync(async () => {
      if (input.length === 0) return

      const keysToDelete = (
        await Promise.all(
          input.map(
            async (item) =>
              item.isFolder
                ? await listAllKeysInFolder(env, item) // Get all keys under the folder
                : [item.key] // Single file
          )
        )
      ).flat()

      await env.FILES.delete(keysToDelete)
    })
  )
