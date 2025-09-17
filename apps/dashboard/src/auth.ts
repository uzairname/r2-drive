
import NextAuth from "next-auth"
import Google from "next-auth/providers/google"

import { getCloudflareContext } from "@opennextjs/cloudflare";

// // Helper function to get environment variables with validation
// function getAuthEnvVars() {

//   const getSecret = () => {
//     const secret = process.env.NEXTAUTH_SECRET ?? (() => {
//       console.log("[AUTH] Using Cloudflare environment for NextAuth Secret");
//       const { env } = getCloudflareContext();
//       return env.NEXTAUTH_SECRET;
//     })();
    
//     if (!secret) {
//       console.error("[AUTH ERROR] NEXTAUTH_SECRET is not configured");
//       throw new Error("NEXTAUTH_SECRET is required for OAuth to work");
//     }
//     return secret;
//   };

//   const getGoogleClientId = () => {
//     const clientId = process.env.GOOGLE_CLIENT_ID ?? (() => {
//       const { env } = getCloudflareContext();
//       console.log("[AUTH] Using Cloudflare environment for Google Client ID");
//       return env.GOOGLE_CLIENT_ID;
//     })();
    
//     if (!clientId) {
//       console.error("[AUTH ERROR] GOOGLE_CLIENT_ID is not configured");
//       throw new Error("GOOGLE_CLIENT_ID is required for Google OAuth");
//     }
//     return clientId;
//   };

//   const getGoogleClientSecret = () => {
//     const clientSecret = process.env.GOOGLE_CLIENT_SECRET ?? (() => {
//       const { env } = getCloudflareContext();
//       console.log("[AUTH] Using Cloudflare environment for Google Client Secret");
//       return env.GOOGLE_CLIENT_SECRET;
//     })();
    
//     if (!clientSecret) {
//       console.error("[AUTH ERROR] GOOGLE_CLIENT_SECRET is not configured");
//       throw new Error("GOOGLE_CLIENT_SECRET is required for Google OAuth");
//     }
//     return clientSecret;
//   };

//   return {
//     secret: getSecret(),
//     googleClientId: getGoogleClientId(),
//     googleClientSecret: getGoogleClientSecret()
//   };
// }

// const authConfig = getAuthEnvVars();


import { isUserAdmin } from "@/lib/auth-helpers";

export const { handlers, signIn, signOut, auth } = NextAuth((req) => {

  const { env } = getCloudflareContext();

  return {
  trustHost: true,
  secret: env.AUTH_SECRET,
  providers: [Google({
    clientId: env.GOOGLE_CLIENT_ID,
    clientSecret: env.GOOGLE_CLIENT_SECRET,
  })],
  callbacks: {
    async session({ session, token, user }) {
      const email = user?.email || token?.email || session?.user?.email;
      let isAdmin = false;
      if (email) {
        isAdmin = await isUserAdmin(email);
      }
      console.log(`[AUTH] isAdmin: ${isAdmin} for email: ${email}`);
      return {
        ...session,
        user: {
          ...session.user,
          isAdmin,
        },
      };
    },
  },
}})

