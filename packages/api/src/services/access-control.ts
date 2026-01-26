import { SharePermission } from '@r2-drive/db'
import { PathUtils } from '@r2-drive/utils'
import { Context } from '../trpc'

export interface AccessCheckResult {
  hasAccess: boolean
  permission: SharePermission | null
  isAdmin: boolean
}

export interface ValidatedToken {
  pathPrefix: string
  permission: SharePermission
}

/**
 * Check if a path is accessible given a set of validated tokens.
 * A token grants access if the path starts with the token's pathPrefix.
 */
function tokenGrantsAccess(token: ValidatedToken, path: string): boolean {
  // Empty prefix means root access (all paths)
  if (token.pathPrefix === '') return true
  // Path must start with the token's prefix
  return PathUtils.isChildOf(path, token.pathPrefix)
}

/**
 * Check if a path is the exact directory that a token grants access to
 * (not a subdirectory or file within it)
 */
function isExactTokenPath(tokenPrefix: string, path: string): boolean {
  // Root access tokens don't have a protected directory
  if (tokenPrefix === '') return false
  return PathUtils.keysEqual(tokenPrefix, path)
}

/**
 * Get the highest permission level for a path from a set of tokens
 * Note: Write permission for a directory only applies to contents within it,
 * not the directory itself (to prevent accidental deletion/rename of shared folders)
 */
function getTokenPermission(tokens: ValidatedToken[], path: string): SharePermission | null {
  let highestPermission: SharePermission | null = null

  for (const token of tokens) {
    if (tokenGrantsAccess(token, path)) {
      // Check if this is the exact token path (the shared directory itself)
      // If so, only grant read access even if the token has write permission
      const isProtectedPath = isExactTokenPath(token.pathPrefix, path)

      if (token.permission === 'write' && !isProtectedPath) {
        return 'write' // Can't get higher, return immediately
      }
      if (highestPermission === null) {
        highestPermission = 'read'
      }
    }
  }

  return highestPermission
}

/**
 * Check if a user has access to a specific path with the required permission
 */
export function checkAccess(
  ctx: Context,
  path: string,
  requiredPermission: SharePermission
): AccessCheckResult {
  // Admin bypasses all checks
  if (ctx.isAdmin) {
    return { hasAccess: true, permission: 'write', isAdmin: true }
  }

  const tokens = ctx.shareTokens || []
  const permission = getTokenPermission(tokens, path)

  if (permission === null) {
    return { hasAccess: false, permission: null, isAdmin: false }
  }

  // Check if the permission level is sufficient
  const hasAccess = permission === 'write' || requiredPermission === 'read'

  return { hasAccess, permission, isAdmin: false }
}

/**
 * Get the effective permission level for a path
 */
export function getEffectivePermission(ctx: Context, path: string): SharePermission | null {
  if (ctx.isAdmin) {
    return 'write'
  }

  const tokens = ctx.shareTokens || []
  return getTokenPermission(tokens, path)
}

/**
 * Check if an item is a parent directory leading to a token's path.
 * e.g., "folder1/" is a parent of "folder1/folder2/file.txt"
 */
function isParentOfTokenPath(token: ValidatedToken, itemKey: string): boolean {
  return PathUtils.isParentOf(itemKey, token.pathPrefix)
}

/**
 * Filter items to only those accessible with at least read permission
 */
export function filterAccessibleItems<T extends { key: string }>(
  ctx: Context,
  items: T[]
): T[] {
  if (ctx.isAdmin) {
    return items
  }

  const tokens = ctx.shareTokens || []
  if (tokens.length === 0) {
    return []
  }

  return items.filter((item) => {
    // Check if any token grants direct access to this item
    const permission = getTokenPermission(tokens, item.key)
    if (permission !== null) return true

    // Check if this item is a parent directory leading to a shared path
    for (const token of tokens) {
      if (isParentOfTokenPath(token, item.key)) {
        return true
      }
    }

    return false
  })
}

/**
 * Check if user has any access (used for list operations at folder level)
 * Returns true if user can see at least some items under a path
 */
export function hasAnyAccess(ctx: Context, folderPath: string): boolean {
  if (ctx.isAdmin) {
    return true
  }

  const tokens = ctx.shareTokens || []

  for (const token of tokens) {
    // Token grants access to this folder or its children
    if (tokenGrantsAccess(token, folderPath)) {
      return true
    }
    // Token grants access to a parent (folder is within token's scope)
    if (PathUtils.isChildOf(folderPath, token.pathPrefix)) {
      return true
    }
    // Token grants access to a subfolder (should show folder but filter contents)
    if (PathUtils.isChildOf(token.pathPrefix, folderPath)) {
      return true
    }
  }

  return false
}
