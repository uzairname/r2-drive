'use client'

import { trpc } from '@/trpc/client'
import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef } from 'react'

const REGISTERED_TOKENS_KEY = 'r2-registered-tokens'
const TOKEN_COOKIE = 'r2-share-tokens'

function getCookie(name: string): string | undefined {
  const value = `; ${document.cookie}`
  const parts = value.split(`; ${name}=`)
  if (parts.length === 2) return parts.pop()?.split(';').shift()
  return undefined
}

function getRegisteredTokens(): Set<string> {
  try {
    const stored = localStorage.getItem(REGISTERED_TOKENS_KEY)
    return stored ? new Set(JSON.parse(stored)) : new Set()
  } catch {
    return new Set()
  }
}

function markTokenAsRegistered(tokenId: string) {
  try {
    const registered = getRegisteredTokens()
    registered.add(tokenId)
    localStorage.setItem(REGISTERED_TOKENS_KEY, JSON.stringify([...registered]))
  } catch {
    // Ignore localStorage errors
  }
}

async function registerTokenAccess(tokenId: string) {
  try {
    await fetch('/api/share/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ tokenId }),
    })
  } catch {
    // Ignore errors - access tracking is not critical
  }
}

/**
 * Check if a token's path prefix grants access to a given path.
 * Mirrors the backend logic from access-control.ts
 */
function tokenGrantsAccess(tokenPrefix: string, path: string): boolean {
  if (tokenPrefix === '') return true // Root access
  return path.startsWith(tokenPrefix)
}

interface PermissionsContextValue {
  isAdmin: boolean
  isLoading: boolean
  canWrite: (path: string) => boolean
  canRead: (path: string) => boolean
}

const PermissionsContext = createContext<PermissionsContextValue | null>(null)

/**
 * Provider that fetches and caches the user's permissions.
 * Should be placed high in the component tree (e.g., in providers.tsx).
 */
export function PermissionsProvider({ children }: { children: React.ReactNode }) {
  const { data, isLoading } = trpc.sharing.validate.useQuery(undefined, {
    staleTime: 5 * 60 * 1000, // Cache for 5 minutes
    refetchOnWindowFocus: false,
  })

  const hasRegisteredRef = useRef(false)

  // Register access for any new tokens (only once per session)
  useEffect(() => {
    if (hasRegisteredRef.current) return
    hasRegisteredRef.current = true

    const cookieValue = getCookie(TOKEN_COOKIE)
    if (!cookieValue) return

    const tokenIds = cookieValue.split(',').filter(Boolean)
    const registeredTokens = getRegisteredTokens()

    for (const tokenId of tokenIds) {
      if (!registeredTokens.has(tokenId)) {
        registerTokenAccess(tokenId)
        markTokenAsRegistered(tokenId)
      }
    }
  }, [])

  const isAdmin = data?.isAdmin ?? false
  const tokens = data?.tokens ?? []

  const canWrite = useCallback(
    (path: string) => {
      if (isAdmin) return true
      return tokens.some((t) => t.permission === 'write' && tokenGrantsAccess(t.pathPrefix, path))
    },
    [isAdmin, tokens]
  )

  const canRead = useCallback(
    (path: string) => {
      if (isAdmin) return true
      return tokens.some((t) => tokenGrantsAccess(t.pathPrefix, path))
    },
    [isAdmin, tokens]
  )

  const value = useMemo(
    () => ({
      isAdmin,
      isLoading,
      canWrite,
      canRead,
    }),
    [isAdmin, isLoading, canWrite, canRead]
  )

  return <PermissionsContext.Provider value={value}>{children}</PermissionsContext.Provider>
}

/**
 * Hook to access the current user's permissions.
 */
export function usePermissions(): PermissionsContextValue {
  const ctx = useContext(PermissionsContext)
  if (!ctx) {
    throw new Error('usePermissions must be used within a PermissionsProvider')
  }
  return ctx
}

/**
 * Component that renders children only if the user has write permission for the given path.
 * This includes admins and users with write share tokens that cover the path.
 */
export function CanWrite({
  path,
  children,
  fallback = null,
}: {
  path: string
  children: React.ReactNode
  fallback?: React.ReactNode
}) {
  const { canWrite, isLoading } = usePermissions()

  if (isLoading) {
    return null
  }

  return canWrite(path) ? <>{children}</> : <>{fallback}</>
}

/**
 * Component that renders children only if the user has read permission for the given path.
 * This includes admins and users with share tokens that cover the path.
 */
export function CanRead({
  path,
  children,
  fallback = null,
}: {
  path: string
  children: React.ReactNode
  fallback?: React.ReactNode
}) {
  const { canRead, isLoading } = usePermissions()

  if (isLoading) {
    return null
  }

  return canRead(path) ? <>{children}</> : <>{fallback}</>
}
