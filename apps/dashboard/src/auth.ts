import { getCloudflareContext } from '@opennextjs/cloudflare'
import { isUserAdmin } from '@r2-drive/api/auth'
import NextAuth from 'next-auth'
import Google from 'next-auth/providers/google'

export const { handlers, signIn, signOut, auth } = NextAuth((req) => {
  const { env } = getCloudflareContext()

  return {
    trustHost: true,
    secret: env.AUTH_SECRET,
    providers: [
      Google({
        clientId: env.GOOGLE_CLIENT_ID,
        clientSecret: env.GOOGLE_CLIENT_SECRET,
      }),
    ],
    callbacks: {
      async session({ session }) {
        const isAdmin = isUserAdmin(session, env)
        return {
          ...session,
          user: {
            ...session.user,
            isAdmin,
          },
        }
      },
    },
  }
})
