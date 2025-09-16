
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/auth";
import { getCloudflareContext } from "@opennextjs/cloudflare";

/**
 * Higher-order function to wrap server actions with admin protection
 */
export function withAdminProtection<T extends any[], R>(
  action: (...args: T) => Promise<R>
) {
  return async (...args: T): Promise<R> => {
    const session = await getServerSession(authOptions);

    if (!session || !session.user?.email) {
      throw new Error("Authentication required");
    }

    const isAdmin = await isUserAdmin(session.user.email);
    if (!isAdmin) {
      throw new Error("Admin access required");
    }

    return action(...args);
  };
} 

/**
 * Check if a user's email is in the ADMIN_EMAILS environment variable
 */
export async function isUserAdmin(email: string): Promise<boolean> {
  try {
    const { env } = getCloudflareContext();
    const adminEmailsStr = env.ADMIN_EMAILS;

    if (!adminEmailsStr) {
      console.warn("ADMIN_EMAILS environment variable not found");
      return false;
    }

    const adminEmails: string[] = JSON.parse(adminEmailsStr);
    return adminEmails.includes(email);
  } catch (error) {
    console.error("Error checking admin status:", error);
    return false;
  }
}

