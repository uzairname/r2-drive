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
  secret: process.env.NEXTAUTH_SECRET,
  debug: true, // Enable debug mode for detailed logging
  logger: {
    error(code, metadata) {
      console.error('NextAuth Error:', { code, metadata });
    },
    warn(code) {
      console.warn('NextAuth Warning:', code);
    },
    debug(code, metadata) {
      console.log('NextAuth Debug:', { code, metadata });
    }
  },
  events: {
    async signIn(message) {
      console.log('SignIn Event:', message);
    },
    async signOut(message) {
      console.log('SignOut Event:', message);
    },
    async createUser(message) {
      console.log('CreateUser Event:', message);
    },
    async session(message) {
      console.log('Session Event:', message);
    }
  },
  callbacks: {
    async signIn({ user, account, profile }) {
      try {
        // Add debugging for production issues
        console.log('NextAuth signIn callback:', {
          user: user?.email,
          provider: account?.provider,
          accountType: account?.type,
          baseUrl: process.env.NEXTAUTH_URL,
          profileEmail: profile?.email,
          timestamp: new Date().toISOString()
        });
        
        // Basic sign-in logic - can be extended later
        return true
      } catch (error) {
        console.error('SignIn callback error:', error);
        return false;
      }
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
  }
})

export { handler as GET, handler as POST }