import { getServerSession } from "next-auth";
import { Session } from "next-auth";
import { getCloudflareContext } from "@opennextjs/cloudflare";

/**
 * Server-side admin validation utilities
 */



/**
 * Checks if the given email is in the admin list from Cloudflare environment
 * @param email - The email to check
 * @returns Promise<boolean> - Whether the user is an admin
 */

export async function isUserAdmin(email: string | null | undefined): Promise<boolean> {
  if (!email) {
    return false;
  }

  try {
    const { env } = await getCloudflareContext();
    const adminEmailsRaw = env.ADMIN_EMAILS as string;

    if (!adminEmailsRaw) {
      console.warn('ADMIN_EMAILS environment variable not found');
      return false;
    }

    // Parse the JSON array of admin emails
    const adminEmails: string[] = JSON.parse(adminEmailsRaw);

    // Check if the user's email is in the admin list (case-insensitive)
    return adminEmails.some(adminEmail => adminEmail.toLowerCase() === email.toLowerCase()
    );
  } catch (error) {
    console.error('Error checking admin status:', error);
    return false;
  }
}



/**
 * Gets the list of admin emails from Cloudflare environment
 * @returns Promise<string[]> - Array of admin emails
 */

export async function getAdminEmails(): Promise<string[]> {
  try {
    const { env } = await getCloudflareContext();
    const adminEmailsRaw = env.ADMIN_EMAILS as string;

    if (!adminEmailsRaw) {
      return [];
    }

    return JSON.parse(adminEmailsRaw);
  } catch (error) {
    console.error('Error fetching admin emails:', error);
    return [];
  }
}


/**
 * Get the current session on the server
 */
export async function getSession(): Promise<Session | null> {
  return await getServerSession();
}

/**
 * Get the current user's session and check if they are an admin
 */
export async function getCurrentUserWithAdminStatus(): Promise<{
  session: Session | null;
  isAdmin: boolean;
}> {
  const session = await getSession();
  const isAdmin = session?.user?.email && await isUserAdmin(session.user.email);
  
  return {
    session,
    isAdmin: !!isAdmin
  };
}

/**
 * Middleware function to check if the current user is an admin
 * Throws an error if the user is not authenticated or not an admin
 */
export async function requireAdmin(): Promise<Session> {
  const { session, isAdmin } = await getCurrentUserWithAdminStatus();
  
  if (!session) {
    throw new Error('Authentication required');
  }
  
  if (!isAdmin) {
    throw new Error('Admin access required');
  }
  
  return session;
}

/**
 * Check if the current user is an admin (returns boolean instead of throwing)
 */
export async function checkIsAdmin(): Promise<boolean> {
  const { isAdmin } = await getCurrentUserWithAdminStatus();
  return isAdmin;
}

/**
 * Higher-order function to wrap server actions with admin protection
 */
export function withAdminProtection<T extends any[], R>(
  action: (...args: T) => Promise<R>
) {
  return async (...args: T): Promise<R> => {
    await requireAdmin();
    return action(...args);
  };
}


/**
 * Method decorator that ensures the user is an admin before executing the method.
 * Can be used on both static and instance methods.
 * 
 * @example
 * class FileService {
 *   @AdminRequired
 *   async deleteFile(id: string) {
 *     // This method can only be called by admins
 *   }
 * 
 *   @AdminRequired
 *   static async deleteAllFiles() {
 *     // Static methods are also supported
 *   }
 * }
 */
export function AdminRequired<T extends any[], R>(
  target: any,
  propertyKey: string | symbol,
  descriptor: TypedPropertyDescriptor<(...args: T) => Promise<R>>
): TypedPropertyDescriptor<(...args: T) => Promise<R>> {
  const originalMethod = descriptor.value;

  if (!originalMethod) {
    throw new Error(`@AdminRequired can only be applied to methods`);
  }

  descriptor.value = async function (...args: T): Promise<R> {
    // Verify admin status before executing the method
    await requireAdmin();
    
    // Execute the original method
    return originalMethod.apply(this, args);
  };

  return descriptor;
}