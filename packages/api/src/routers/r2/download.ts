import { z } from 'zod'
import { publicProcedure } from '../../trpc'

export const download = publicProcedure.input(z.object({ key: z.string() })).query(async ({}) => {
  return {}
})
