"use server"

import { R2_CONFIG } from '@/config/app-config'
import { getCloudflareContext } from '@opennextjs/cloudflare'
import { Path, Paths } from './path'
import { Result, err, ok, safe, safeAsync } from './result'
import { withAdminProtection } from './auth-helpers'

// Represents file/folder structure
export interface R2Item {
  path: Path
  size: number
  lastModified?: Date
  originalLastModified?: Date // Original file modification time
}

/**
 * Get the R2 bucket name from Cloudflare environment
 */
export async function getBucketName(): Promise<string> {
  return getCloudflareContext().env.R2_BUCKET_NAME
}


/**
 * Low level utility to list objects in an R2 bucket with a specific prefix
 */
async function _listObjectsWithPrefix(
  prefix: string,
  delimiter: '/' | undefined,
  limit = R2_CONFIG.DEFAULT_LIST_LIMIT
) {
  const objects: R2Object[] = []
  const delimitedPrefixes: string[] = []

  let cursor: string | undefined
  let hasMore = true

  const { env } = getCloudflareContext()

  while (hasMore) {
    const listing = await env.FILES.list({
      prefix,
      delimiter,
      limit,
      cursor,
    })

    objects.push(...listing.objects)
    delimitedPrefixes.push(...listing.delimitedPrefixes)

    hasMore = listing.truncated
    if (hasMore && 'cursor' in listing) {
      cursor = listing.cursor
    } else {
      cursor = undefined
    }
  }
  return { objects, delimitedPrefixes }
}

/**
 * Returns the keys of all objects under the specified folder,
 * including in subfolders
 */
export async function listAllKeysInFolder(folder: Path): Promise<string[]> {
  const { objects } = await _listObjectsWithPrefix(folder.key, undefined)
  return objects.map(o => o.key)
}


/**
 * List files and folders directly under the specified folder path that
 * can be displayed in the file explorer.
 * Excludes the placeholder object for the folder itself.
 */
export async function listDisplayableItemsInFolder(folder: Path): Promise<Result<{
  files: R2Item[]
  folders: R2Item[]
}>> {
  return safeAsync(async () => {

    const { objects, delimitedPrefixes } = await _listObjectsWithPrefix(folder.key, '/')

    console.log('Objects in folder:', {
      'object keys': objects.map(o => o.key),
      'delimited prefixes': delimitedPrefixes,
    })

    const files = objects.filter((obj) =>
      // Exclude the object that is a placeholder for the empty folder
      !obj.key.endsWith('/')
    ).map((obj) => {
      return {
        path: Paths.fromR2Key(obj.key),
        size: obj.size,
        lastModified: obj.customMetadata?.lastModified
          ? new Date(parseInt(obj.customMetadata.lastModified))
          : obj.uploaded,
      }
    })

    // Convert delimitedPrefixes to folder FileItems
    const folders = delimitedPrefixes.map((prefix) => ({
      path: Paths.fromR2Key(prefix),
      size: 0,
      lastModified: undefined,
    }))

    return {
      files,
      folders,
    }
  })
}

/**
 * Delete multiple files or folders from the bucket
 */
export async function _deleteObjects(itemPaths: Path[]): Promise<Result<void>> {
  return safeAsync(async () => {
    if (itemPaths.length === 0) return

    console.log(`item paths to delete:`, itemPaths)

    const keysToDelete = (await Promise.all(itemPaths.map(async item => 
      item.isFolder
        ? await listAllKeysInFolder(item) // Get all keys under the folder
        : [item.key] // Single file
    ))).flat()

    console.log('Deleting keys:', keysToDelete)

    const { env } = getCloudflareContext()
    await env.FILES.delete(keysToDelete)
  })
}

export const deleteObjects = withAdminProtection(_deleteObjects)

/**
 * Create a folder by uploading an empty object with the folder name as the key
 * Ending with a trailing slash to indicate it's a folder
 */
export async function _createFolder(baseFolder: Path, name: string): Promise<Result> {
  return safeAsync(async () => {
    // Validate folder name
    if (!name || !name.trim()) {
      throw new Error('Folder name cannot be empty')
    }
  
    // Remove invalid characters
    const sanitizedName = name.trim().replace(/[<>:"/\\|?*]/g, '')
    if (sanitizedName !== name.trim()) {
      throw new Error('Folder name contains invalid characters')
    }
  
    const folderKey = Paths.getChildFolder(baseFolder, sanitizedName).key
  
    const { env } = getCloudflareContext()
    await env.FILES.put(folderKey, null)
  })
}

export const createFolder = withAdminProtection(_createFolder)

