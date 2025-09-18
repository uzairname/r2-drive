
import NextAuth from "next-auth"
import Google from "next-auth/providers/google"
import { isUserAdmin } from "@/lib/auth-helpers";
import { getCloudflareContext } from "@opennextjs/cloudflare";

export const { handlers, signIn, signOut, auth } = NextAuth((req) => {

  const { env } = getCloudflareContext();

  console.log(`admin emails: " ${env.ADMIN_EMAILS} "`)

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

