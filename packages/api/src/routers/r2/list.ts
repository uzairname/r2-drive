import { PathSchema } from '@r2-drive/utils/path'
import z from 'zod'
import { listDisplayableItemsInFolder } from '../../services/r2'
import { publicProcedure } from '../../trpc'

export const list = publicProcedure
  .input(z.object({ folder: PathSchema }))
  .query(async ({ ctx: { env }, input: { folder } }) => listDisplayableItemsInFolder(env, folder))
