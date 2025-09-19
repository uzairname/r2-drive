import { R2_CONFIG, UPLOAD_CONFIG } from '@/config/app-config'
import { UploadResult } from '@/types/upload'
import { getCloudflareContext } from '@opennextjs/cloudflare'
import { revalidatePath } from 'next/cache'
import { Path, Paths } from './path'
import { Result, err, makeError, ok, safeAsync } from './result'

// Represents file/folder structure
export interface R2Item {
  path: Path
  size: number
  lastModified?: Date
  originalLastModified?: Date // Original file modification time
  etag: string
}

interface R2ListOptions {
  prefix?: string
  delimiter?: string
  limit?: number
  cursor?: string
}

interface R2ListResult {
  objects: R2Item[]
  folders: R2Item[]
  truncated: boolean
  cursor?: string
}

export interface ListFilesResult {
  objects: R2Item[]
  folders: R2Item[]
  path: Path
}

export type DeleteObjectsErrors = {
  objectKey: string
  error: Error
}[]

export class R2Client {
  private r2: R2Bucket

  constructor() {
    const { env } = getCloudflareContext()
    this.r2 = env.FILES
  }

  /**
   * Lists all objects in the given folder
   */
  private async listR2Objects(
    folder: Path,
    delimiter?: string,
    getAllResults = false
  ): Promise<{
    objects: R2Object[]
    delimitedPrefixes: string[]
    truncated: boolean
    cursor?: string
  }> {
    const allObjects: R2Object[] = []
    const allDelimitedPrefixes: string[] = []
    let cursor: string | undefined
    let hasMore = true

    while (hasMore) {
      const options: R2ListOptions = {
        prefix: folder.key,
        delimiter,
        limit: R2_CONFIG.LIST_LIMIT,
        cursor,
      }

      const listing = await this.r2.list(options)

      allObjects.push(...listing.objects)
      allDelimitedPrefixes.push(...listing.delimitedPrefixes)

      hasMore = listing.truncated && getAllResults
      if (hasMore && 'cursor' in listing) {
        cursor = listing.cursor
      } else {
        cursor = undefined
      }

      // If we only want one page, break after first iteration
      if (!getAllResults) break
    }

    return {
      objects: allObjects,
      delimitedPrefixes: allDelimitedPrefixes,
      truncated: hasMore,
      cursor,
    }
  }

  /**
   * List objects in the bucket with an optional prefix and delimiter
   */
  private async listObjects(folder: Path, delimiter = '/'): Promise<R2ListResult> {
    const result = await this.listR2Objects(folder, delimiter, false)

    const regularObjects = result.objects.filter((obj) => {
      // Exclude zero-byte objects that represent folders
      return !(obj.key.endsWith('/') && obj.size === 0)
    })

    const objects = regularObjects.map((obj) => {
      const path = Paths.fromR2Key(obj.key)
      // Note: R2 list operations don't include custom metadata
      // We use the R2 upload timestamp for now, but could enhance
      // this with a separate metadata service if needed
      return {
        path: path,
        size: obj.size,
        lastModified: obj.uploaded,
        etag: obj.etag,
      }
    })

    // Convert delimitedPrefixes to folder FileItems
    const folders = result.delimitedPrefixes.map((prefix) => ({
      path: Paths.fromR2Key(prefix),
      size: 0,
      lastModified: undefined,
      etag: '',
    }))

    return {
      objects,
      folders,
      truncated: result.truncated,
      cursor: result.cursor,
    }
  }

  async listFiles(path: Path): Promise<Result<ListFilesResult, Error>> {
    return safeAsync(async () => {
      const result = await this.listObjects(path, '/')
      return {
        objects: result.objects,
        folders: result.folders,
        path,
      }
    })
  }

  /**
   * Get an object from the bucket with the specified key
   */
  async getObject(key: string): Promise<Result<R2ObjectBody | null, Error>> {
    return safeAsync(async () => {
      return await this.r2.get(key)
    })
  }

  /**
   * Get object metadata including custom metadata
   */
  async getObjectMetadata(key: string): Promise<
    Result<
      {
        size: number
        lastModified: Date
        originalLastModified?: Date
        etag: string
        customMetadata?: Record<string, string>
      } | null,
      Error
    >
  > {
    return safeAsync(async () => {
      const obj = await this.r2.head(key)
      if (!obj) return null

      const originalLastModified = obj.customMetadata?.originalLastModified
        ? new Date(parseInt(obj.customMetadata.originalLastModified))
        : undefined

      return {
        size: obj.size,
        lastModified: obj.uploaded,
        originalLastModified,
        etag: obj.etag,
        customMetadata: obj.customMetadata,
      }
    })
  }

  /**
   * Uploads an object whose size is below the multipart threshold, from the server
   */
  async uploadSmallObject(
    folder: Path,
    file: File,
    onProgress?: (progress: { uploaded: number; total: number }) => void
  ): Promise<UploadResult> {
    // Ensure size is below multipart threshold
    if (file.size > UPLOAD_CONFIG.MULTIPART_THRESHOLD_BYTES) {
      return err({
        fileName: file.name,
        error: new Error(
          `File ${file.name} is too large for single upload, exceeds ${UPLOAD_CONFIG.MULTIPART_THRESHOLD_BYTES / (1024 * 1024)} MB`
        ),
      })
    }

    try {
      const key = Paths.filePath(folder, file).key

      // Prepare metadata with original lastModified time
      const customMetadata = {
        originalLastModified: file.lastModified.toString(),
        originalName: file.name,
      }

      const data = await file.arrayBuffer()

      // Prepare R2 put options with custom metadata
      const putOptions: R2PutOptions = {
        customMetadata,
      }

      const totalSize = data.byteLength

      onProgress?.({ uploaded: 0, total: totalSize })
      await this.r2.put(key, data, putOptions)
      onProgress?.({ uploaded: totalSize, total: totalSize })

      return ok({
        fileName: file.name,
      })
    } catch (error) {
      return err({
        fileName: file.name,
        error: makeError(error),
      })
    }
  }

  /**
   * Delete an object from the bucket
   */
  async deleteObject(key: string): Promise<Result<void, Error>> {
    return safeAsync(async () => {
      await this.r2.delete(key)
    })
  }

  /**
   * List the keys of all objects with a given prefix
   */
  async listObjectKeys(path: Path): Promise<string[]> {
    const result = await this.listR2Objects(path, '/', true)
    return result.objects.map((obj) => obj.key)
  }

  /**
   * Delete multiple files or folders from the bucket
   */
  async deleteObjects(itemPaths: Path[]): Promise<Result<void, DeleteObjectsErrors>> {
    try {
      const errors: { objectKey: string; error: Error }[] = []

      // Separate folders from files
      const folders = itemPaths.filter((item) => item.isFolder)
      const files = itemPaths.filter((item) => !item.isFolder)

      // Delete files directly
      if (files.length > 0) {
        try {
          await this._deleteObjects(files)
        } catch (error) {
          errors.push({
            objectKey: 'file(s)',
            error: error instanceof Error ? error : new Error(String(error)),
          })
        }
      }

      // Delete folders by deleting all objects with that prefix
      for (const folder of folders) {
        try {
          const objectsInFolder = await this.listObjects(folder)
          if (objectsInFolder.objects.length > 0) {
            const objectPaths = objectsInFolder.objects.map((o) => o.path)
            await this._deleteObjects(objectPaths)
          }
        } catch (error) {
          errors.push({
            objectKey: folder.key,
            error: error instanceof Error ? error : new Error(String(error)),
          })
        }
      }

      if (errors.length > 0) {
        return err(errors)
      }

      return ok(undefined)
    } catch (error) {
      return err([{ objectKey: 'unknown', error: makeError(error) }])
    }
  }

  /**
   * Delete multiple objects from the bucket
   */
  private async _deleteObjects(itemPaths: Path[]): Promise<void> {
    // R2 delete method can handle arrays for bulk deletion
    if (itemPaths.length === 0) return

    // Delete in batches if we have too many keys
    const batchSize = R2_CONFIG.BATCH_DELETE_SIZE // R2 limit for bulk operations
    for (let i = 0; i < itemPaths.length; i += batchSize) {
      const batch = itemPaths.slice(i, i + batchSize).map((item) => item.key)
      await this.r2.delete(batch)
    }
  }

  /**
   * Create a folder by uploading an empty object with the folder name as the key
   * Ending with a trailing slash to indicate it's a folder
   */
  async createFolder(baseFolder: Path, name: string): Promise<Result<void, string>> {
    // Validate folder name
    if (!name || !name.trim()) {
      return err('Folder name cannot be empty')
    }

    // Remove invalid characters
    const sanitizedName = name.trim().replace(/[<>:"/\\|?*]/g, '')
    if (sanitizedName !== name.trim()) {
      return err('Folder name contains invalid characters')
    }

    const folderKey = Paths.getChildFolder(baseFolder, sanitizedName).key
    await this.r2.put(folderKey, '')

    // Revalidate the current path to refresh the UI
    revalidatePath('/explorer')

    return ok(undefined)
  }

  /**
   * Initiate a multipart upload for presigned URL approach
   */
  async createMultipartUpload(key: string, options?: R2PutOptions): Promise<R2MultipartUpload> {
    return await this.r2.createMultipartUpload(key, options)
  }

  /**
   * Complete a multipart upload
   */
  async completeMultipartUpload(
    uploadId: string,
    key: string,
    parts: R2UploadedPart[]
  ): Promise<R2Object | null> {
    const multipartUpload = this.r2.resumeMultipartUpload(key, uploadId)
    return await multipartUpload.complete(parts)
  }

  /**
   * Abort a multipart upload
   */
  async abortMultipartUpload(uploadId: string, key: string): Promise<void> {
    const multipartUpload = this.r2.resumeMultipartUpload(key, uploadId)
    await multipartUpload.abort()
  }
}
