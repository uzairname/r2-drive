import { NextRequest, NextResponse } from "next/server";
import { getToken } from "next-auth/jwt";
import { isUserAdmin } from "./auth";

/**
 * API route middleware to check if the current user is an admin
 */
export async function requireAdminAPI(request: NextRequest): Promise<NextResponse | null> {
  try {
    const token = await getToken({ req: request });
    
    if (!token || !token.email) {
      return NextResponse.json(
        { error: "Authentication required" },
        { status: 401 }
      );
    }
    
    const isAdmin = await isUserAdmin(token.email);
    if (!isAdmin) {
      return NextResponse.json(
        { error: "Admin access required" },
        { status: 403 }
      );
    }
    
    // Return null if admin check passes
    return null;
  } catch (error) {
    console.error("Error checking admin status in API:", error);
    return NextResponse.json(
      { error: "Authentication error" },
      { status: 500 }
    );
  }
}

/**
 * Higher-order function to wrap API route handlers with admin protection
 */
export function withAdminAPIProtection<T extends any[]>(
  handler: (request: NextRequest, ...args: T) => Promise<NextResponse>
) {
  return async (request: NextRequest, ...args: T): Promise<NextResponse> => {
    const adminCheckResult = await requireAdminAPI(request);
    if (adminCheckResult) {
      return adminCheckResult; // Return the error response
    }
    
    return handler(request, ...args);
  };
}