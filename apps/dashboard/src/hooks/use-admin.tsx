'use client'

import { useSession } from 'next-auth/react'

/**
 * Client-side hook to check if the current user is an admin
 */
export function useIsAdmin() {
  const { data: session, status } = useSession()
  return {
    isAdmin: !!session?.user?.isAdmin,
    isLoading: status === 'loading',
    isAuthenticated: status === 'authenticated',
    session,
  }
}

/**
 * Higher-order component to conditionally render content for admin users only
 */
export function AdminOnly({
  children,
  fallback = null,
}: {
  children: React.ReactNode
  fallback?: React.ReactNode
}) {
  const { isAdmin, isLoading } = useIsAdmin()

  if (isLoading) {
    return null // or a loading spinner
  }

  return isAdmin ? <>{children}</> : <>{fallback}</>
}

/**
 * Higher-order component to conditionally render content for non-admin users
 */
export function NonAdminOnly({
  children,
  fallback = null,
}: {
  children: React.ReactNode
  fallback?: React.ReactNode
}) {
  const { isAdmin, isLoading } = useIsAdmin()

  if (isLoading) {
    return null // or a loading spinner
  }

  return !isAdmin ? <>{children}</> : <>{fallback}</>
}
