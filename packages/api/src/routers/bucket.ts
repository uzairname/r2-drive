import { publicProcedure } from '..'

export const bucket = publicProcedure.query(async ({ ctx: { env } }) => {
  return { name: env.R2_BUCKET_NAME }
})
