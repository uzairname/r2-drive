import { getCloudflareContext } from '@opennextjs/cloudflare'
import { and, createDb, eq, gt, isNull, or, shareTokens, sql } from '@r2-drive/db'
import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  try {
    const { tokenId } = await request.json()

    if (!tokenId || typeof tokenId !== 'string') {
      return NextResponse.json({ success: false }, { status: 400 })
    }

    const { env } = getCloudflareContext()

    if (!env.DATABASE_URL) {
      return NextResponse.json({ success: false }, { status: 500 })
    }

    const db = createDb(env.DATABASE_URL)
    const now = new Date()

    // Only update if token exists and is not expired
    const result = await db
      .update(shareTokens)
      .set({
        lastAccessedAt: now,
        accessCount: sql`${shareTokens.accessCount} + 1`,
      })
      .where(
        and(
          eq(shareTokens.id, tokenId),
          or(isNull(shareTokens.expiresAt), gt(shareTokens.expiresAt, now))
        )
      )
      .returning({ id: shareTokens.id })

    return NextResponse.json({ success: result.length > 0 })
  } catch {
    return NextResponse.json({ success: false }, { status: 500 })
  }
}
