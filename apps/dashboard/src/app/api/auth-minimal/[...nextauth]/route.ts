import NextAuth from "next-auth"
import GoogleProvider from "next-auth/providers/google"

// Minimal configuration for testing
const handler = NextAuth({
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    })
  ],
  secret: process.env.NEXTAUTH_SECRET,
  debug: true,
  logger: {
    error(code, metadata) {
      console.error('NextAuth Error:', { code, metadata, timestamp: new Date().toISOString() });
    },
    warn(code) {
      console.warn('NextAuth Warning:', { code, timestamp: new Date().toISOString() });
    },
    debug(code, metadata) {
      console.log('NextAuth Debug:', { code, metadata, timestamp: new Date().toISOString() });
    }
  },
  callbacks: {
    async signIn({ user, account, profile }) {
      console.log('MINIMAL SignIn callback reached:', {
        userEmail: user?.email,
        provider: account?.provider,
        timestamp: new Date().toISOString()
      });
      return true;
    }
  }
})

export { handler as GET, handler as POST }