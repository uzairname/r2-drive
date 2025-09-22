import { R2_CONFIG } from '@r2-drive/utils/app-config'
import { Path, Paths } from '@r2-drive/utils/path'
import { Result, safeAsync } from '@r2-drive/utils/result'
import { UIR2Item } from '@r2-drive/utils/types/item'

/**
 * Low level utility to list objects in an R2 bucket with a specific prefix
 */
export async function _listObjectsWithPrefix(
  env: CloudflareEnv,
  prefix: string,
  delimiter: '/' | undefined,
  limit = R2_CONFIG.DEFAULT_LIST_LIMIT
) {
  const objects: R2Object[] = []
  const delimitedPrefixes: string[] = []

  let cursor: string | undefined
  let hasMore = true

  while (hasMore) {
    const listing = await env.FILES.list({
      prefix,
      delimiter,
      limit,
      cursor,
      include: ['httpMetadata', 'customMetadata'],
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
export async function listAllKeysInFolder(env: CloudflareEnv, folder: Path): Promise<string[]> {
  const { objects } = await _listObjectsWithPrefix(env, folder.key, undefined)
  return objects.map((o) => o.key)
}

/**
 * List files and folders directly under the specified folder path that
 * can be displayed in the file explorer.
 * Excludes the placeholder object for the folder itself.
 */
export async function listDisplayableItemsInFolder(
  env: CloudflareEnv,
  folder: Path
): Promise<
  Result<{
    files: UIR2Item[]
    folders: UIR2Item[]
    bucketName: string
  }>
> {
  return safeAsync(async () => {
    const { objects, delimitedPrefixes } = await _listObjectsWithPrefix(env, folder.key, '/')

    // console.log('Objects in folder:', {
    //   'object keys': objects.map((o) => o.key),
    //   'delimited prefixes': delimitedPrefixes,
    // })

    const files = objects
      .filter(
        (obj) =>
          // Exclude the object that is a placeholder for the empty folder
          !obj.key.endsWith('/')
      )
      .map((obj) => {
        return {
          path: Paths.fromR2Key(obj.key),
          size: obj.size,
          lastModified: obj.customMetadata?.lastModified
            ? new Date(parseInt(obj.customMetadata.lastModified))
            : obj.uploaded,
          contentType: obj.httpMetadata?.contentType,
          dateCreated: obj.customMetadata?.dateCreated
            ? new Date(parseInt(obj.customMetadata.dateCreated))
            : undefined,
        }
      })

    // Convert delimitedPrefixes to folder FileItems
    const folders = delimitedPrefixes.map((prefix) => ({
      path: Paths.fromR2Key(prefix),
      size: 0,
      lastModified: undefined,
    }))

    const bucketName = env.R2_BUCKET_NAME

    return {
      files,
      folders,
      bucketName,
    }
  })
}
