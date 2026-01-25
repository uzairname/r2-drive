import { auth } from '@/auth'
import { createDb, shareTokens } from '@r2-drive/db'
import { getCloudflareContext } from '@opennextjs/cloudflare'
import { and, eq, gt, isNull, or } from 'drizzle-orm'
import { NextRequest, NextResponse } from 'next/server'

function isUserAdmin(email: string | undefined | null, env: CloudflareEnv): boolean {
  if (!email || !env.ADMIN_EMAILS) return false
  const adminEmails = env.ADMIN_EMAILS.split(',').map((e) => e.trim()).filter(Boolean)
  return adminEmails.includes(email)
}

async function checkDownloadAccess(
  env: CloudflareEnv,
  key: string,
  tokenHeader: string | null,
  isAdmin: boolean
): Promise<boolean> {
  // Admin bypasses all checks
  if (isAdmin) return true

  // No tokens means no access
  if (!tokenHeader || !env.DATABASE_URL) return false

  const tokenIds = tokenHeader.split(',').map((t) => t.trim()).filter(Boolean)
  if (tokenIds.length === 0) return false

  const db = createDb(env.DATABASE_URL)
  const now = new Date()

  for (const tokenId of tokenIds) {
    const result = await db
      .select({ pathPrefix: shareTokens.pathPrefix })
      .from(shareTokens)
      .where(
        and(
          eq(shareTokens.id, tokenId),
          or(isNull(shareTokens.expiresAt), gt(shareTokens.expiresAt, now))
        )
      )
      .limit(1)

    if (result.length > 0 && result[0]) {
      const pathPrefix = result[0].pathPrefix
      // Empty prefix = root access, or key starts with prefix
      if (pathPrefix === '' || key.startsWith(pathPrefix)) {
        return true
      }
    }
  }

  return false
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const key = searchParams.get('key')

    if (!key) {
      return NextResponse.json({ error: 'Missing key parameter' }, { status: 400 })
    }

    const { env } = getCloudflareContext()
    const session = await auth()
    const isAdmin = isUserAdmin(session?.user?.email, env)
    const tokenHeader = request.headers.get('X-Share-Tokens')

    // Check access
    const hasAccess = await checkDownloadAccess(env, key, tokenHeader, isAdmin)
    if (!hasAccess) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 })
    }

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
