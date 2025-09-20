import { withAdminAPIProtection } from '@/lib/api-middleware'
import { getR2Url } from '@/lib/r2-utils'
import { getCloudflareContext } from '@opennextjs/cloudflare'
import { AwsClient } from 'aws4fetch'
import { NextRequest, NextResponse } from 'next/server'

function parseUploadId(xml: string): string | null {
  const uploadIdMatch = xml.match(/<UploadId>(.*?)<\/UploadId>/)
  return uploadIdMatch?.[1] || null
}

async function _POST(request: NextRequest) {
  try {
    const { env } = getCloudflareContext()

    const r2 = new AwsClient({
      accessKeyId: env.R2_ACCESS_KEY_ID,
      secretAccessKey: env.R2_SECRET_ACCESS_KEY,
      region: 'auto',
      service: 's3',
    })

    const { smallFiles, largeFiles } = (await request.json()) as {
      smallFiles: { key: string }[]
      largeFiles: { key: string; partCount: number }[]
    }

    // 1. Generate presigned URLs for single-part uploads
    const singleUploads = await Promise.all(
      smallFiles.map(async ({ key }) => {
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
      largeFiles.map(async ({ key, partCount }) => {
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

    return NextResponse.json({ singleUploads, multiPartUploads })
  } catch (error) {
    console.error('Error preparing uploads:', error)
    return NextResponse.json({ error: 'Failed to prepare uploads' }, { status: 500 })
  }
}

export const POST = withAdminAPIProtection(_POST)
