// /**
//  * Higher-order function to wrap server actions with admin protection
//  */
// export function withAdminProtection<T extends any[], R>(action: (...args: T) => Promise<R>) {
//   return async (...args: T): Promise<R> => {
//     const authResult = await checkAdminAuth()

//     if (!authResult.success) {
//       throw new Error(authResult.error.message)
//     }

//     return action(...args)
//   }
// }

// /**
//  * Check if the current user is authenticated and has admin access
//  */
// export async function checkAdminAuth(): Promise<Result<{ email: string }>> {
//   return safeAsync(async () => {
//     const session = await auth()

//     if (!session || !session.user?.email) {
//       throw new Error('Authentication required')
//     }

//     const isAdmin = await isUserAdmin(session.user.email)
//     if (!isAdmin) {
//       throw new Error('Admin access required')
//     }

//     return { email: session.user.email }
//   })
// }

// /**
//  * Check if a user's email is in the list of admin emails
//  */
// export async function isUserAdmin(email: string): Promise<boolean> {
//   const { env } = getCloudflareContext()
// }
