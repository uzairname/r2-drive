import { Session } from 'next-auth'

export function isUserAdmin(session: Session | null, env: CloudflareEnv): boolean {
  const email = session?.user?.email

  if (!email) {
    return false
  }

  if (!env.ADMIN_EMAILS) {
    console.warn('[AUTH] No admin emails configured in ADMIN_EMAILS')
    return false
  }

  const adminEmails = env.ADMIN_EMAILS.split(',')
    .map((e) => e.trim())
    .filter((e) => e.length > 0)

  return adminEmails.includes(email)
}
