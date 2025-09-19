import { auth } from '@/auth'
import { getCloudflareContext } from '@opennextjs/cloudflare'
import { Result, safeAsync } from './result'

/**
 * Higher-order function to wrap server actions with admin protection
 */
export function withAdminProtection<T extends any[], R>(action: (...args: T) => Promise<R>) {
  return async (...args: T): Promise<R> => {
    const authResult = await checkAdminAuth()

    if (!authResult.success) {
      throw new Error(authResult.error.message)
    }

    return action(...args)
  }
}

/**
 * Check if the current user is authenticated and has admin access
 */
export async function checkAdminAuth(): Promise<Result<{ email: string }>> {
  return safeAsync(async () => {
    const session = await auth()

    if (!session || !session.user?.email) {
      throw new Error('Authentication required')
    }

    const isAdmin = await isUserAdmin(session.user.email)
    if (!isAdmin) {
      throw new Error('Admin access required')
    }

    return { email: session.user.email }
  })
}

/**
 * Check if a user's email is in the list of admin emails
 */
export async function isUserAdmin(email: string): Promise<boolean> {
  const { env } = getCloudflareContext()

  const adminEmailsEnv = env.ADMIN_EMAILS
  if (!adminEmailsEnv) {
    console.warn('[AUTH] No admin emails configured in ADMIN_EMAILS')
    return false
  }
  const adminEmails = adminEmailsEnv
    .split(',')
    .map((e) => e.trim())
    .filter((e) => e.length > 0)

  return adminEmails.includes(email)
}
