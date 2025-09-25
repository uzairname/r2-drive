import { inferProcedureInput } from '@trpc/server'
import { AwsClient } from 'aws4fetch'
import { createHash } from 'crypto'
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

        // 1. Generate presigned URLs for single-part uploads
        const singleUploads = await Promise.all(
          input.smallFiles.map(async ({ key, metadata }) => {
            const url = getR2Url(key, env)

            // `signQuery: true` creates a presigned URL by adding auth info to query params
            const signedUrl = await r2.sign(new Request(url, { method: 'PUT' }), {
              aws: { signQuery: true },
            })
            return { key, url: signedUrl.url }
          })
        )

        // 2. Initiate multipart uploads and generate presigned URLs for each part
        const multiPartUploads = await Promise.all(
          input.largeFiles.map(async ({ key, partCount, metadata }) => {
            // Step A: Initiate the multipart upload to get an UploadId
            const createUploadUrl = `${getR2Url(key, env)}?uploads`

            const createUploadRequest = await r2.sign(createUploadUrl, { method: 'POST' })
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

        const md5 = createHash('md5').update(Buffer.from(xmlBody, 'utf8')).digest('base64')

        const completeRequest = await r2.sign(completeUploadUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/xml',
            'Content-MD5': md5,
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

  // Cancel (abort) a single multipart upload
  cancel: adminProcedure
    .input(
      z.object({
        key: z.string(),
        uploadId: z.string(),
      })
    )
    .mutation(async ({ ctx: { env }, input }) => {
      try {
        const { key, uploadId } = input

        if (!key || !uploadId) {
          throw new Error('Missing key or uploadId for cancel')
        }

        const r2 = new AwsClient({
          accessKeyId: env.R2_ACCESS_KEY_ID,
          secretAccessKey: env.R2_SECRET_ACCESS_KEY,
          region: 'auto',
          service: 's3',
        })

        const abortUrl = `${getR2Url(key, env)}?uploadId=${encodeURIComponent(uploadId)}`

        const abortRequest = await r2.sign(abortUrl, { method: 'DELETE' })
        const abortResponse = await fetch(abortRequest)

        if (!abortResponse.ok) {
          const err = await abortResponse.text()
          console.error('Failed to abort multipart upload:', err)
          throw new Error(`Failed to abort upload: ${err}`)
        }

        return { success: true }
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred'
        console.error('Error cancelling upload:', error)
        throw new Error(`Failed to cancel upload: ${errorMessage}`)
      }
    }),

  // Cancel (abort) all multipart uploads optionally filtered by prefix
  cancelAll: adminProcedure
    .input(
      z.object({
        prefix: z.string().optional(),
      })
    )
    .mutation(async ({ ctx: { env }, input }) => {
      try {
        const { prefix } = input

        const r2 = new AwsClient({
          accessKeyId: env.R2_ACCESS_KEY_ID,
          secretAccessKey: env.R2_SECRET_ACCESS_KEY,
          region: 'auto',
          service: 's3',
        })

        // List multipart uploads for the bucket (optionally filtered by prefix)
        const listUrl = `${getR2Url('', env)}?uploads${prefix ? `&prefix=${encodeURIComponent(prefix)}` : ''}`

        const listRequest = await r2.sign(listUrl, { method: 'GET' })
        const listResponse = await fetch(listRequest)

        if (!listResponse.ok) {
          const err = await listResponse.text()
          console.error('Failed to list multipart uploads:', err)
          throw new Error(`Failed to list uploads: ${err}`)
        }

        const xml = await listResponse.text()
        const uploads = parseUploadsList(xml)

        let aborted = 0
        for (const u of uploads) {
          try {
            const abortUrl = `${getR2Url(u.key, env)}?uploadId=${encodeURIComponent(u.uploadId)}`
            const abortRequest = await r2.sign(abortUrl, { method: 'DELETE' })
            const abortResponse = await fetch(abortRequest)

            if (abortResponse.ok) aborted++
            else {
              const err = await abortResponse.text()
              console.warn(`Failed to abort ${u.key} (${u.uploadId}):`, err)
            }
          } catch (e) {
            console.warn('Error aborting upload', u, e)
          }
        }

        return { success: true, total: uploads.length, aborted }
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred'
        console.error('Error cancelling all uploads:', error)
        throw new Error(`Failed to cancel all uploads: ${errorMessage}`)
      }
    }),
}

// Helper function to parse upload ID from XML response
function parseUploadId(xml: string): string | null {
  const uploadIdMatch = xml.match(/<UploadId>(.*?)<\/UploadId>/)
  return uploadIdMatch?.[1] || null
}

// Parse the ListMultipartUploads XML to extract an array of { key, uploadId }
function parseUploadsList(xml: string): Array<{ key: string; uploadId: string }> {
  const uploads: Array<{ key: string; uploadId: string }> = []
  // Matches <Upload> ... <Key>...</Key> ... <UploadId>...</UploadId> ... </Upload>
  const uploadRegex =
    /<Upload>[\s\S]*?<Key>([\s\S]*?)<\/Key>[\s\S]*?<UploadId>([\s\S]*?)<\/UploadId>[\s\S]*?<\/Upload>/g
  let match
  // eslint-disable-next-line no-cond-assign
  while ((match = uploadRegex.exec(xml))) {
    const key = match[1]
    const uploadId = match[2]
    if (key && uploadId) uploads.push({ key, uploadId })
  }
  return uploads
}

// Helper function to get R2 URL
function getR2Url(key: string, env: CloudflareEnv): string {
  const baseUrl = `https://${env.CLOUDFLARE_ACCOUNT_ID}.r2.cloudflarestorage.com`
  return `${baseUrl}/${env.R2_BUCKET_NAME}/${key}`
}
