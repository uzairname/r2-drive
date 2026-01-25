import { R2_CONFIG } from '@r2-drive/utils/app-config'
import { Path, PathUtils } from '@r2-drive/utils/path'
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
 * Returns all files (not folder placeholders) under the specified folder,
 * including in subfolders, with their keys and sizes.
 * Used for folder downloads.
 */
export async function listAllFilesInFolder(
  env: CloudflareEnv,
  folder: Path
): Promise<Array<{ key: string; size: number }>> {
  const { objects } = await _listObjectsWithPrefix(env, folder.key, undefined)
  return objects
    .filter((obj) => !obj.key.endsWith('/')) // Exclude folder placeholders
    .map((obj) => ({
      key: obj.key,
      size: obj.size,
    }))
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
          path: PathUtils.fromR2Key(obj.key),
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
      path: PathUtils.fromR2Key(prefix),
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

/**
 * Rename an object in R2 by copying it to a new key and deleting the original.
 * R2 does not support direct rename operations, so this is accomplished via server-side copy + delete.
 * Uses R2's S3-compatible copy API to avoid loading file data into Worker memory.
 *
 * @throws Error if the new key already exists or the original object is not found
 */
export async function renameR2Object(
  env: CloudflareEnv,
  oldKey: string,
  newKey: string
): Promise<Result<void>> {
  return safeAsync(async () => {
    // Import AwsClient for S3-compatible API access
    const { AwsClient } = await import('aws4fetch')

    // Verify the new key doesn't exist
    const existingObject = await env.FILES.head(newKey)
    if (existingObject) {
      throw new Error('An object with the new name already exists')
    }

    // Verify the original object exists
    const originalObject = await env.FILES.head(oldKey)
    if (!originalObject) {
      throw new Error('Original object not found')
    }

    // Use R2's S3-compatible copy operation via HTTP API
    // This performs a server-side copy without loading data into Worker memory
    const r2 = new AwsClient({
      accessKeyId: env.R2_ACCESS_KEY_ID,
      secretAccessKey: env.R2_SECRET_ACCESS_KEY,
      region: 'auto',
      service: 's3',
    })

    const baseUrl = `https://${env.CLOUDFLARE_ACCOUNT_ID}.r2.cloudflarestorage.com`
    const copyUrl = `${baseUrl}/${env.R2_BUCKET_NAME}/${newKey}`

    const copyRequest = await r2.sign(copyUrl, {
      method: 'PUT',
      headers: {
        'x-amz-copy-source': `/${env.R2_BUCKET_NAME}/${oldKey}`,
        'x-amz-metadata-directive': 'COPY',
      },
    })

    const copyResponse = await fetch(copyRequest)

    if (!copyResponse.ok) {
      const errorBody = await copyResponse.text()
      throw new Error(`Failed to copy object: ${errorBody}`)
    }

    // Delete the original
    await env.FILES.delete(oldKey)
  })
}
