import { withAdminAPIProtection } from '@/lib/api-middleware'
import { getCloudflareContext } from '@opennextjs/cloudflare'
import { NextRequest, NextResponse } from 'next/server'

async function _POST(request: NextRequest) {
  const env = getCloudflareContext().env

  try {
    const body = await request.json()
    const { uploadId, key, partNumbers } = body as {
      uploadId: string
      key: string
      partNumbers: number[]
    }

    if (!uploadId || !key || !partNumbers || !Array.isArray(partNumbers)) {
      return NextResponse.json(
        { error: 'Missing required parameters: uploadId, key, partNumbers' },
        { status: 400 }
      )
    }

    // For now, we'll use a simpler approach by generating URLs with a pattern
    // In a production environment, you would use aws4fetch or similar to generate proper presigned URLs
    const accountId = env.CLOUDFLARE_ACCOUNT_ID
    const bucketName = env.R2_BUCKET_NAME

    console.log('R2_BUCKET_NAME:', bucketName)

    if (!accountId || !bucketName) {
      throw new Error('Missing environment configuration')
    }

    // Generate presigned-like URLs for each part
    // Note: This is a simplified approach. In production, you'd use proper AWS signature v4
    const presignedUrls = partNumbers.map((partNumber) => ({
      partNumber,
      url: `/api/upload/multipart/upload-part?uploadId=${uploadId}&key=${encodeURIComponent(key)}&partNumber=${partNumber}`,
    }))
    console.log('Generated presigned URLs:', presignedUrls)
    return NextResponse.json({ presignedUrls })
  } catch (error) {
    console.error('Error generating presigned URLs:', error)
    throw error
    // return NextResponse.json(
    //   { error: "Failed to generate presigned URLs" },
    //   { status: 500 }
    // );
  }
}

export const POST = withAdminAPIProtection(_POST)
