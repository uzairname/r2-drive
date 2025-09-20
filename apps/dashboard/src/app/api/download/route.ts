import { getCloudflareContext } from '@opennextjs/cloudflare'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const key = searchParams.get('key')

    if (!key) {
      return NextResponse.json({ error: 'Missing key parameter' }, { status: 400 })
    }

    const { env } = getCloudflareContext()
    const object = await env.FILES.get(key)

    if (!object) {
      return NextResponse.json({ error: 'File not found' }, { status: 404 })
    }

    // Set appropriate headers for download
    const headers = new Headers()
    headers.set('Content-Type', object.httpMetadata?.contentType || 'application/octet-stream')
    headers.set('Content-Length', object.size.toString())

    // Set filename for download
    const filename = key.split('/').pop() || key
    headers.set('Content-Disposition', `attachment; filename="${filename}"`)

    return new NextResponse(object.body, { headers })
  } catch (error) {
    console.error('Error downloading file:', error)
    return NextResponse.json(
      {
        error: `Failed to download file: ${error instanceof Error ? error.message : String(error)}`,
      },
      { status: 500 }
    )
  }
}
