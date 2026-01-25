import { publicProcedure } from '../../trpc'

export const bucketInfo = publicProcedure.query(async ({ ctx: { env } }) => ({
  bucketName: env.R2_BUCKET_NAME,
}))
