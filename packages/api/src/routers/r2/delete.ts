import { PathSchema } from '@r2-drive/utils'
import { safeAsync } from '@r2-drive/utils/result'
import { TRPCError } from '@trpc/server'
import { z } from 'zod'
import { checkAccess } from '../../services/access-control'
import { listAllKeysInFolder } from '../../services/r2'
import { publicProcedure } from '../../trpc'

export const deleteObjects = publicProcedure
  .input(z.array(PathSchema))
  .mutation(async ({ ctx, input }) =>
    safeAsync(async () => {
      if (input.length === 0) return

      // Check write permission for all items
      for (const item of input) {
        const access = checkAccess(ctx, item.key, 'write')
        if (!access.hasAccess) {
          throw new TRPCError({
            code: 'FORBIDDEN',
            message: `No write access to ${item.key}`,
          })
        }
      }

      const keysToDelete = (
        await Promise.all(
          input.map(
            async (item) =>
              item.isFolder
                ? await listAllKeysInFolder(ctx.env, item) // Get all keys under the folder
                : [item.key] // Single file
          )
        )
      ).flat()

      await ctx.env.FILES.delete(keysToDelete)
    })
  )
