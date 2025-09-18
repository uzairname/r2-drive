
import { auth } from "@/auth";
import { getCloudflareContext } from "@opennextjs/cloudflare";
import { Result, safeAsync } from "./result";

/**
 * Higher-order function to wrap server actions with admin protection
 */
export function withAdminProtection<T extends any[], R>(
  action: (...args: T) => Promise<R>
) {
  return async (...args: T): Promise<R> => {
    const authResult = await checkAdminAuth();
    
    if (!authResult.success) {
      throw new Error(authResult.error.message);
    }

    return action(...args);
  };
}

/**
 * Check if the current user is authenticated and has admin access
 */
export async function checkAdminAuth(): Promise<Result<{ email: string }>> {
  return safeAsync(async () => {
    const session = await auth();

    if (!session || !session.user?.email) {
      throw new Error("Authentication required");
    }

    const isAdmin = await isUserAdmin(session.user.email);
    if (!isAdmin) {
      throw new Error("Admin access required");
    }

    return { email: session.user.email };
  });
}

/**
 * Check if a user's email is in the ADMIN_EMAILS environment variable
 */
export async function isUserAdmin(email: string): Promise<boolean> {
  const result = await safeAsync(async () => {
    const { env } = getCloudflareContext();
    const adminEmailsStr = env.ADMIN_EMAILS;

    if (!adminEmailsStr) {
      throw new Error("ADMIN_EMAILS environment variable not found");
    }

    const adminEmails: string[] = JSON.parse(adminEmailsStr);
    console.log(`admin emails: ${adminEmails.join(", ")}`);
    console.log(`checking if ${email} is admin`);
    console.log(`is admin: ${adminEmails.includes(email)}`);
    return adminEmails.includes(email);
  });

  if (!result.success) {
    console.error("Error checking admin status:", result.error);
    return false;
  }

  return result.data;
}

