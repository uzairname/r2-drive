import { PathSchema } from '@r2-drive/utils'
import { TRPCError } from '@trpc/server'
import { AwsClient } from 'aws4fetch'
import { z } from 'zod'
import { checkAccess } from '../../services/access-control'
import { publicProcedure } from '../../trpc'

export const renameObject = publicProcedure
  .input(
    z.object({
      oldPath: PathSchema.refine((p) => !p.isFolder, { message: 'oldPath must be a file path' }),
      newKey: z
        .string()
        .min(1, { message: 'newKey cannot be empty' })
        .refine((k) => !k.endsWith('/'), { message: 'newKey cannot be a folder path' }),
    })
  )
  .mutation(async ({ ctx, input }): Promise<void> => {
      const { oldPath, newKey } = input
      const { env } = ctx

      // Check write permission on source path
      const access = checkAccess(ctx, oldPath.key, 'write')
      if (!access.hasAccess) {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: 'No write access to this file',
        })
      }

      // Check if the new key already exists
      const existingObject = await env.FILES.head(newKey)
      if (existingObject) {
        throw new Error('An object with the new name already exists')
      }

      // Verify the original object exists (head is cheaper than get for large files)
      const originalObjectMetadata = await env.FILES.head(oldPath.key)
      if (!originalObjectMetadata) {
        throw new Error('Original object not found')
      }

      // In development mode, the R2 binding uses local emulation but the S3 API
      // would hit the production bucket. Block this to prevent confusion.
      if (env.NODE_ENV === 'development') {
        throw new TRPCError({
          code: 'PRECONDITION_FAILED',
          message:
            'Rename is not supported in development mode. The R2 binding uses local emulation, but the S3 copy API requires production credentials. Run with --remote or test in production.',
        })
      }

      // Use R2's S3-compatible copy operation via HTTP API
      // This performs a server-side copy without loading data into Worker memory
      // Works efficiently even for multi-GB files
      const r2 = new AwsClient({
        accessKeyId: env.R2_ACCESS_KEY_ID,
        secretAccessKey: env.R2_SECRET_ACCESS_KEY,
        region: 'auto',
        service: 's3',
      })

      const baseUrl = `https://${env.CLOUDFLARE_ACCOUNT_ID}.r2.cloudflarestorage.com`
      const copyUrl = `${baseUrl}/${env.R2_BUCKET_NAME}/${newKey}`

      // The x-amz-copy-source header tells R2 to copy from the source object
      // The source path must be URL-encoded for the S3 API
      const encodedSourceKey = oldPath.key
        .split('/')
        .map((segment) => encodeURIComponent(segment))
        .join('/')

      const copySource = `/${env.R2_BUCKET_NAME}/${encodedSourceKey}`

      const copyRequest = await r2.sign(copyUrl, {
        method: 'PUT',
        headers: {
          'x-amz-copy-source': copySource,
          'x-amz-metadata-directive': 'COPY', // Preserve metadata
        },
      })

      const copyResponse = await fetch(copyRequest)

      if (!copyResponse.ok) {
        const errorBody = await copyResponse.text()
        // Parse XML for code and message
        const matchCode = errorBody.match(/<Code>(.*?)<\/Code>/)
        const matchMessage = errorBody.match(/<Message>(.*?)<\/Message>/)
        const errorCode = matchCode ? matchCode[1] : 'UnknownError'
        const errorMessage = matchMessage ? matchMessage[1] : 'Unknown error occurred'
        throw new Error(`Failed to copy object: ${errorCode}: ${errorMessage}`)
      }

      // Delete the original object
      await env.FILES.delete(oldPath.key)
    }
  )
