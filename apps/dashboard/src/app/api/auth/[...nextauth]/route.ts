import NextAuth from "next-auth"
import GoogleProvider from "next-auth/providers/google"
import { isUserAdmin } from "@/lib/auth"

const handler = NextAuth({
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    })
  ],
  callbacks: {
    async signIn({ user, account, profile }) {
      // Basic sign-in logic - can be extended later
      return true
    },
    async session({ session, token }) {
      // Add admin status to session from JWT token
      if (session.user) {
        session.user.isAdmin = token.isAdmin as boolean
      }
      return session
    },
    async jwt({ token, account, user }) {
      // Add custom JWT data if needed
      if (account) {
        token.accessToken = account.access_token
      }
      
      // Add admin status to token when user signs in or when token is refreshed
      if (user?.email || token.email) {
        const email = user?.email || token.email as string
        token.isAdmin = await isUserAdmin(email)
      }
      
      return token
    }
  },
  pages: {
    signIn: '/auth/signin', // Optional custom sign-in page
  }
})

export { handler as GET, handler as POST }