import { auth } from '@/auth'
import { createDb, shareTokens } from '@r2-drive/db'
import { getCloudflareContext } from '@opennextjs/cloudflare'
import { and, eq, gt, isNull, or } from 'drizzle-orm'
import { NextRequest, NextResponse } from 'next/server'

const TOKEN_COOKIE = 'r2-share-tokens'

function isUserAdmin(email: string | undefined | null, env: CloudflareEnv): boolean {
  if (!email || !env.ADMIN_EMAILS) return false
  const adminEmails = env.ADMIN_EMAILS.split(',').map((e) => e.trim()).filter(Boolean)
  return adminEmails.includes(email)
}

async function checkPreviewAccess(
  env: CloudflareEnv,
  key: string,
  tokens: string | null,
  isAdmin: boolean
): Promise<boolean> {
  // Admin bypasses all checks
  if (isAdmin) return true

  // No tokens means no access
  if (!tokens || !env.DATABASE_URL) return false

  const tokenIds = tokens.split(',').map((t) => t.trim()).filter(Boolean)
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

    // Get tokens from cookie (primary) or header (fallback for programmatic access)
    const tokenCookie = request.cookies.get(TOKEN_COOKIE)?.value
    const tokenHeader = request.headers.get('X-Share-Tokens')
    const tokens = tokenCookie || tokenHeader

    // Check access
    const hasAccess = await checkPreviewAccess(env, key, tokens, isAdmin)
    if (!hasAccess) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 })
    }

    const object = await env.FILES.get(key)

    if (!object) {
      return NextResponse.json({ error: 'File not found' }, { status: 404 })
    }

    // Set appropriate headers for inline viewing (not download)
    const headers = new Headers()
    const contentType = object.httpMetadata?.contentType || 'application/octet-stream'
    headers.set('Content-Type', contentType)
    headers.set('Content-Length', object.size.toString())

    // Use inline disposition for viewing in browser
    // Use RFC 5987 encoding for non-ASCII filenames
    const filename = key.split('/').pop() || key
    const encodedFilename = encodeURIComponent(filename).replace(/['()]/g, escape)
    headers.set('Content-Disposition', `inline; filename*=UTF-8''${encodedFilename}`)

    // Allow caching for performance
    headers.set('Cache-Control', 'private, max-age=3600')

    return new NextResponse(object.body, { headers })
  } catch (error) {
    console.error('Error previewing file:', error)
    return NextResponse.json(
      {
        error: `Failed to preview file: ${error instanceof Error ? error.message : String(error)}`,
      },
      { status: 500 }
    )
  }
}
