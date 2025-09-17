import { isUserAdmin } from "../lib/auth-helpers";

export async function checkIsAdminClient(email: string | undefined | null): Promise<boolean> {
  if (!email) return false;
  // isUserAdmin is async and expects a string
  return await isUserAdmin(email);
}
