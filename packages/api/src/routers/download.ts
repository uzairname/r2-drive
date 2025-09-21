import { z } from 'zod';
import { router, publicProcedure } from '../trpc';
import { getCloudflareContext } from '@opennextjs/cloudflare'

export const download = publicProcedure
    .input(z.object({ key: z.string() }))
    .query(async ({ input }) => {

      const { env } = getCloudflareContext()

      const url = await env.FILES.get(input.key)

      return {
        url
      };
    })
