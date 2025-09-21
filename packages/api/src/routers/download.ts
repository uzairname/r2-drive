import { z } from 'zod';
import { publicProcedure } from '../trpc';
import { getCloudflareContext } from '@opennextjs/cloudflare'

export const download = publicProcedure
    .input(z.object({ key: z.string() }))
    .query(async ({ input }) => {

      const { env } = getCloudflareContext()

      return {};
    })
