import { getCloudflareContext } from '@opennextjs/cloudflare'
import { getToken } from 'next-auth/jwt'
import { NextRequest, NextResponse } from 'next/server'
import { isUserAdmin } from './auth-helpers'

/**
 * API route middleware to check if the current user is an admin
 */
export async function requireAdminAPI(request: NextRequest): Promise<NextResponse | null> {
  try {
    const { env } = getCloudflareContext()
    const token = await getToken({
      req: request,
      secret: env.AUTH_SECRET,
    })

    if (!token || !token.email) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
    }

    const isAdmin = await isUserAdmin(token.email)
    if (!isAdmin) {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 })
    }

    // Return null if admin check passes
    return null
  } catch (error) {
    console.error('Error checking admin status in API:', error)
    return NextResponse.json({ error: 'Authentication error' }, { status: 500 })
  }
}

/**
 * Higher-order function to wrap API route handlers with admin protection
 */
export function withAdminAPIProtection<T extends any[]>(
  handler: (request: NextRequest, ...args: T) => Promise<NextResponse>
) {
  return async (request: NextRequest, ...args: T): Promise<NextResponse> => {
    return (await requireAdminAPI(request)) ?? handler(request, ...args) // Return the error response, if not run the handler
  }
}
