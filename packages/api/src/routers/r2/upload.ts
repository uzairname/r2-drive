import { inferProcedureInput } from '@trpc/server'
import { AwsClient } from 'aws4fetch'
import { z } from 'zod'
import { adminProcedure } from '../../trpc'

type PrepareUploadInput = inferProcedureInput<typeof uploadRouter.prepare>
type PrepareUploadOutput = Awaited<ReturnType<typeof uploadRouter.prepare>>
type CompleteUploadInput = inferProcedureInput<typeof uploadRouter.complete>
type CompleteUploadOutput = Awaited<ReturnType<typeof uploadRouter.complete>>

export interface PresignedUploadOperations {
  prepare: (input: PrepareUploadInput) => Promise<PrepareUploadOutput>
  complete: (input: CompleteUploadInput) => Promise<CompleteUploadOutput>
}

const MetadataSchema = z.object({
  contentType: z.string().optional(),
  lastModified: z.number().optional(),
  dateCreated: z.number().optional(),
})

type Metadata = z.infer<typeof MetadataSchema>

export const uploadRouter = {
  // Prepare upload - generates presigned URLs for single part and multipart uploads
  prepare: adminProcedure
    .input(
      z.object({
        smallFiles: z.array(
          z.object({
            key: z.string(),
            metadata: MetadataSchema.optional(),
          })
        ),
        largeFiles: z.array(
          z.object({
            key: z.string(),
            partCount: z.number().int().positive(),
            metadata: MetadataSchema.optional(),
          })
        ),
      })
    )
    .mutation(async ({ ctx, input }) => {
      try {
        const { env } = ctx

        const r2 = new AwsClient({
          accessKeyId: env.R2_ACCESS_KEY_ID,
          secretAccessKey: env.R2_SECRET_ACCESS_KEY,
          region: 'auto',
          service: 's3',
        })

        const getHeaders = (metadata: Metadata | undefined) => {
          const headers: Record<string, string> = {}
          if (metadata?.contentType) {
            headers['Content-Type'] = metadata.contentType
          }
          if (metadata?.lastModified) {
            headers['x-amz-meta-lastModified'] = metadata.lastModified.toString()
          }
          if (metadata?.dateCreated) {
            headers['x-amz-meta-dateCreated'] = metadata.dateCreated.toString()
          }
          return headers
        }

        // 1. Generate presigned URLs for single-part uploads
        const singleUploads = await Promise.all(
          input.smallFiles.map(async ({ key, metadata }) => {
            const url = getR2Url(key, env)

            const headers = getHeaders(metadata)

            // `signQuery: true` creates a presigned URL by adding auth info to query params
            const signedUrl = await r2.sign(new Request(url, { method: 'PUT', headers }), {
              aws: { signQuery: true },
            })
            return { key, url: signedUrl.url, headers }
          })
        )

        // 2. Initiate multipart uploads and generate presigned URLs for each part
        const multiPartUploads = await Promise.all(
          input.largeFiles.map(async ({ key, partCount, metadata }) => {
            // Step A: Initiate the multipart upload to get an UploadId
            const createUploadUrl = `${getR2Url(key, env)}?uploads`

            const headers = getHeaders(metadata)

            const createUploadRequest = await r2.sign(createUploadUrl, { method: 'POST', headers })
            const createUploadResponse = await fetch(createUploadRequest)

            if (!createUploadResponse.ok) {
              throw new Error(`Failed to create multipart upload for ${key}`)
            }

            const responseXml = await createUploadResponse.text()
            const uploadId = parseUploadId(responseXml)
            if (!uploadId) {
              throw new Error(`Could not parse UploadId for ${key}. Response: ${responseXml}`)
            }

            // Step B: Generate a presigned URL for each part
            const partUrls: string[] = []
            for (let partNumber = 1; partNumber <= partCount; partNumber++) {
              const partUrl = `${getR2Url(key, env)}?partNumber=${partNumber}&uploadId=${uploadId}`

              const signedPartUrl = await r2.sign(new Request(partUrl, { method: 'PUT' }), {
                aws: { signQuery: true },
              })
              partUrls.push(signedPartUrl.url)
            }

            return { key, uploadId, partUrls }
          })
        )

        return { singleUploads, multiPartUploads }
      } catch (error) {
        console.error('Error preparing uploads:', error)
        throw new Error('Failed to prepare uploads')
      }
    }),

  // Complete multipart upload
  complete: adminProcedure
    .input(
      z.object({
        key: z.string(),
        uploadId: z.string(),
        parts: z.array(
          z.object({
            partNumber: z.number().int().positive(),
            etag: z.string(),
          })
        ),
      })
    )
    .mutation(async ({ ctx: { env }, input }) => {
      try {
        const { key, uploadId, parts } = input

        if (!key || !uploadId || !parts.length) {
          throw new Error('Missing required fields for upload completion')
        }

        const completeUploadUrl = `${getR2Url(key, env)}?uploadId=${uploadId}`

        // Construct the XML body for the CompleteMultipartUpload request
        const xmlBody = `
          <CompleteMultipartUpload xmlns="http://s3.amazonaws.com/doc/2006-03-01/">
            ${parts.map((p) => `<Part><PartNumber>${p.partNumber}</PartNumber><ETag>${p.etag}</ETag></Part>`).join('')}
          </CompleteMultipartUpload>
        `.trim()

        const r2 = new AwsClient({
          accessKeyId: env.R2_ACCESS_KEY_ID,
          secretAccessKey: env.R2_SECRET_ACCESS_KEY,
          region: 'auto',
          service: 's3',
        })

        // Sign and send the request to R2
        const completeRequest = await r2.sign(completeUploadUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/xml',
            'Content-MD5': btoa(String.fromCharCode(...new TextEncoder().encode(xmlBody))),
          },
          body: xmlBody,
        })

        const completeResponse = await fetch(completeRequest)

        if (!completeResponse.ok) {
          const errorBody = await completeResponse.text()
          console.error('Failed to complete multipart upload:', errorBody)
          throw new Error(`Failed to complete R2 upload: ${errorBody}`)
        }

        return { success: true }
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred'
        console.error('Error completing upload:', error)
        throw new Error(`Failed to complete upload: ${errorMessage}`)
      }
    }),
}

// Helper function to parse upload ID from XML response
function parseUploadId(xml: string): string | null {
  const uploadIdMatch = xml.match(/<UploadId>(.*?)<\/UploadId>/)
  return uploadIdMatch?.[1] || null
}

// Helper function to get R2 URL
function getR2Url(key: string, env: CloudflareEnv): string {
  const baseUrl = `https://${env.CLOUDFLARE_ACCOUNT_ID}.r2.cloudflarestorage.com`
  return `${baseUrl}/${env.R2_BUCKET_NAME}/${key}`
}
