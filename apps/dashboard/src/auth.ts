// src/auth.ts
import NextAuth, { NextAuthOptions } from "next-auth"
import GoogleProvider from "next-auth/providers/google"
import { isUserAdmin } from "./lib/auth-helpers";
import { getCloudflareContext } from "@opennextjs/cloudflare";

// Helper function to get environment variables with validation
function getAuthConfigEnvVars() {
  const getSecret = () => {
    const secret = process.env.NEXTAUTH_SECRET ?? (() => {
      const { env } = getCloudflareContext();
      console.log("[AUTH] Using Cloudflare environment for NextAuth Secret");
      return env.NEXTAUTH_SECRET;
    })();
    
    if (!secret) {
      console.error("[AUTH ERROR] NEXTAUTH_SECRET is not configured");
      throw new Error("NEXTAUTH_SECRET is required for OAuth to work");
    }
    return secret;
  };

  const getGoogleClientId = () => {
    const clientId = process.env.GOOGLE_CLIENT_ID ?? (() => {
      const { env } = getCloudflareContext();
      console.log("[AUTH] Using Cloudflare environment for Google Client ID");
      return env.GOOGLE_CLIENT_ID;
    })();
    
    if (!clientId) {
      console.error("[AUTH ERROR] GOOGLE_CLIENT_ID is not configured");
      throw new Error("GOOGLE_CLIENT_ID is required for Google OAuth");
    }
    return clientId;
  };

  const getGoogleClientSecret = () => {
    const clientSecret = process.env.GOOGLE_CLIENT_SECRET ?? (() => {
      const { env } = getCloudflareContext();
      console.log("[AUTH] Using Cloudflare environment for Google Client Secret");
      return env.GOOGLE_CLIENT_SECRET;
    })();
    
    if (!clientSecret) {
      console.error("[AUTH ERROR] GOOGLE_CLIENT_SECRET is not configured");
      throw new Error("GOOGLE_CLIENT_SECRET is required for Google OAuth");
    }
    return clientSecret;
  };

  return {
    secret: getSecret(),
    googleClientId: getGoogleClientId(),
    googleClientSecret: getGoogleClientSecret()
  };
}

const authConfig = getAuthConfigEnvVars();

export const authOptions: NextAuthOptions = {
  secret: authConfig.secret,
  providers: [
    GoogleProvider({
      clientId: authConfig.googleClientId,
      clientSecret: authConfig.googleClientSecret,
    })
  ],
  debug: process.env.NODE_ENV === "development",
  logger: {
    error(code, metadata) {
      console.error("[AUTH ERROR]", code, metadata);
      
      // Add extra debugging for OAuth callback errors
      if (code === "OAUTH_CALLBACK_ERROR" && metadata && typeof metadata === 'object' && 'error' in metadata) {
        console.error("[AUTH ERROR] OAuth callback details:", {
          errorName: metadata.error?.name,
          errorMessage: metadata.error?.message,
          provider: 'providerId' in metadata ? metadata.providerId : 'unknown',
          stack: metadata.error?.stack,
          authConfig: JSON.stringify(authConfig)
        });
      }
    },
    warn(code) {
      console.warn("[AUTH WARN]", code);
    },
    debug(code, metadata) {
      console.log("[AUTH DEBUG]", code, metadata);
    },
  },
  callbacks: {
    async session({ session, token }) {
      console.log("[AUTH] Session callback called", {
        sessionUserId: session.user?.id,
        sessionUserEmail: session.user?.email,
        tokenEmail: token.email
      });
      
      // Add isAdmin property to the session user
      if (session.user?.email) {
        console.log("[AUTH] Checking admin status for user:", session.user.email);
        session.user.isAdmin = await isUserAdmin(session.user.email);
        console.log("[AUTH] User admin status:", session.user.isAdmin);
      }
      
      console.log("[AUTH] Session callback completed", {
        hasUser: !!session.user,
        isAdmin: session.user?.isAdmin
      });
      
      return session;
    },
    async jwt({ token, user, account }) {
      console.log("[AUTH] JWT callback called", {
        hasUser: !!user,
        hasAccount: !!account,
        tokenEmail: token.email,
        userEmail: user?.email,
        accountProvider: account?.provider
      });
      
      // Add user info to token if available
      if (user) {
        console.log("[AUTH] Adding user info to token:", user.email);
        token.email = user.email;
      }
      
      if (account) {
        console.log("[AUTH] OAuth account info:", {
          provider: account.provider,
          type: account.type,
          providerAccountId: account.providerAccountId
        });
      }
      
      return token;
    },
    async signIn({ user, account, profile }) {
      console.log("[AUTH] SignIn callback called", {
        userEmail: user.email,
        userName: user.name,
        accountProvider: account?.provider,
        profileEmail: profile?.email
      });
      
      // Always allow sign in, but log the attempt
      const allowed = true;
      console.log("[AUTH] Sign in", allowed ? "allowed" : "denied", "for user:", user.email);
      
      return allowed;
    },
  },
}

export default NextAuth(authOptions)
