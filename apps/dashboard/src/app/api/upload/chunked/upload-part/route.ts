import { withAdminAPIProtection } from '@/lib/api-middleware'
import { getCloudflareContext } from '@opennextjs/cloudflare'
import { NextRequest, NextResponse } from 'next/server'

async function _PUT(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const uploadId = searchParams.get('uploadId')
    const key = searchParams.get('key')
    const partNumber = searchParams.get('partNumber')

    if (!uploadId || !key || !partNumber) {
      return NextResponse.json(
        { error: 'Missing required parameters: uploadId, key, partNumber' },
        { status: 400 }
      )
    }

    const partNumberInt = parseInt(partNumber, 10)
    if (isNaN(partNumberInt) || partNumberInt < 1) {
      return NextResponse.json({ error: 'Invalid part number' }, { status: 400 })
    }

    const env = getCloudflareContext().env

    // Get the request body
    const body = await request.arrayBuffer()

    if (!body || body.byteLength === 0) {
      return NextResponse.json({ error: 'Missing or empty request body' }, { status: 400 })
    }

    // Resume the multipart upload and upload this part
    const multipartUpload = await env.FILES.resumeMultipartUpload(key, uploadId)
    const uploadedPart = await multipartUpload.uploadPart(partNumberInt, body)

    return NextResponse.json({
      partNumber: partNumberInt,
      etag: uploadedPart.etag,
    })
  } catch (error) {
    console.error('Error uploading part:', error)
    return NextResponse.json({ error: 'Failed to upload part' }, { status: 500 })
  }
}

export const PUT = withAdminAPIProtection(_PUT)
