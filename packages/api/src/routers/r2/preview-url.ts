import { TRPCError } from '@trpc/server'
import { AwsClient } from 'aws4fetch'
import { z } from 'zod'
import { checkAccess } from '../../services/access-control'
import { publicProcedure } from '../../trpc'

export const previewUrl = publicProcedure
  .input(z.object({ key: z.string() }))
  .query(async ({ ctx, input }) => {
    const { env } = ctx

    // Check read access
    const access = checkAccess(ctx, input.key, 'read')
    if (!access.hasAccess) {
      throw new TRPCError({
        code: 'FORBIDDEN',
        message: `No read access to ${input.key}`,
      })
    }

    // Get file metadata for content type
    const object = await env.FILES.head(input.key)
    if (!object) {
      throw new TRPCError({
        code: 'NOT_FOUND',
        message: `File not found: ${input.key}`,
      })
    }

    // Generate presigned GET URL
    const r2 = new AwsClient({
      accessKeyId: env.R2_ACCESS_KEY_ID,
      secretAccessKey: env.R2_SECRET_ACCESS_KEY,
      region: 'auto',
      service: 's3',
    })

    const baseUrl = `https://${env.CLOUDFLARE_ACCOUNT_ID}.r2.cloudflarestorage.com`
    const url = `${baseUrl}/${env.R2_BUCKET_NAME}/${input.key}`

    const signedRequest = await r2.sign(new Request(url, { method: 'GET' }), {
      aws: { signQuery: true },
    })

    return {
      url: signedRequest.url,
      contentType: object.httpMetadata?.contentType,
      size: object.size,
    }
  })
