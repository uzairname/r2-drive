'use client'

import { UPLOAD_CONFIG } from '@/config/app-config'
import type {
  MultipartUploadInit,
  MultipartUploadPart,
  MultipartUploadResult,
  PresignedUrlInfo,
} from '@/types/upload'
import { ItemUploadProgress } from '@workspace/ui/components/upload-progress'
import { Path, Paths } from './path'
import { err, makeError, ok } from './result'

// export interface MultipartUploadProgress {
//   fileName: string;
//   totalSize: number;
//   percentDone: number;
//   totalParts?: number;
//   completed: boolean;
//   error?: string;
// }

/**
 * Upload files using client-side chunks and presigned URLs
 */
export async function uploadFileClientChunked(
  folder: Path,
  file: File,
  onProgress?: (progress: ItemUploadProgress) => void
): Promise<MultipartUploadResult> {
  const filePath = Paths.filePath(folder, file)
  const fileName = file.name
  const fileSize = file.size
  const totalParts = Math.ceil(fileSize / UPLOAD_CONFIG.MAX_CONCURRENT_PARTS)

  console.log(
    `Starting multipart upload for ${fileName}, size: ${fileSize} bytes, total parts: ${totalParts}, path: ${folder}`
  )

  try {
    // Step 1: Initiate multipart upload
    const initResponse = await fetch('/api/upload/multipart/initiate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        key: filePath.key,
        contentType: file.type || 'application/octet-stream',
        lastModified: file.lastModified,
      }),
    })

    if (!initResponse.ok) {
      throw new Error(`Failed to initiate upload: ${initResponse.statusText}`)
    }

    const { uploadId, key }: MultipartUploadInit = await initResponse.json()

    // Step 2: Generate part numbers and get presigned URLs in batches
    const parts: MultipartUploadPart[] = []
    let uploadedBytes = 0

    onProgress?.({
      fileName,
      percentDone: 0,
      completed: false,
      isMultipart: true,
    })
    // Process parts in batches to respect concurrent limits
    for (let i = 0; i < totalParts; i += UPLOAD_CONFIG.MAX_CONCURRENT_PARTS) {
      const batchEnd = Math.min(i + UPLOAD_CONFIG.MAX_CONCURRENT_PARTS, totalParts)
      const batchPartNumbers = Array.from({ length: batchEnd - i }, (_, idx) => i + idx + 1)

      // Get presigned URLs for this batch
      const urlsResponse = await fetch('/api/upload/multipart/presigned-urls', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          uploadId,
          key,
          partNumbers: batchPartNumbers,
        }),
      })

      if (!urlsResponse.ok) {
        throw new Error(`Failed to get presigned URLs: ${urlsResponse.statusText}`)
      }

      const { presignedUrls }: { presignedUrls: PresignedUrlInfo[] } = await urlsResponse.json()

      // Upload parts in this batch concurrently
      const batchPromises = presignedUrls.map(async ({ partNumber, url }) => {
        const start = (partNumber - 1) * UPLOAD_CONFIG.DEFAULT_CHUNK_SIZE
        const end = Math.min(start + UPLOAD_CONFIG.DEFAULT_CHUNK_SIZE, fileSize)
        const chunk = file.slice(start, end)

        const uploadResponse = await fetch(url, {
          method: 'PUT',
          body: chunk,
          headers: {
            'Content-Type': 'application/octet-stream',
          },
        })

        if (!uploadResponse.ok) {
          throw new Error(`Failed to upload part ${partNumber}: ${uploadResponse.statusText}`)
        }

        const { etag } = (await uploadResponse.json()) as { etag: string }
        uploadedBytes += chunk.size

        onProgress?.({
          fileName,
          percentDone: Math.round((uploadedBytes / fileSize) * 100),
          completed: false,
          isMultipart: true,
        })

        return {
          partNumber,
          etag,
        }
      })

      const batchResults = await Promise.all(batchPromises)
      parts.push(...batchResults)

      // Small delay between batches to prevent overwhelming the server
      if (batchEnd < totalParts) {
        await new Promise((resolve) => setTimeout(resolve, 100))
      }
    }

    // Step 3: Complete multipart upload
    const completeResponse = await fetch('/api/upload/multipart/complete', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        uploadId,
        key,
        parts: parts.sort((a, b) => a.partNumber - b.partNumber),
      }),
    })

    if (!completeResponse.ok) {
      throw new Error(`Failed to complete upload: ${completeResponse.statusText}`)
    }

    // this.reportProgress(fileName, fileSize, fileSize, totalParts, totalParts, true);
    onProgress?.({
      fileName,
      percentDone: 100,
      completed: true,
      isMultipart: true,
    })

    return ok({
      fileName,
      uploadId,
      parts,
      isMultipart: true,
    })
  } catch (error) {
    onProgress?.({
      fileName,
      percentDone: 0,
      completed: false,
      error: error instanceof Error ? error.message : String(error),
      isMultipart: true,
    })
    console.error(`Error uploading file ${fileName}:`, error)

    return err({
      error: makeError(error),
      fileName,
      isMultipart: true,
    })
  }
}

/**
 * Upload multiple files using multipart upload
 */
export async function uploadFilesMultipart(
  path: Path,
  files: File[],
  onProgress?: (progress: ItemUploadProgress) => void
): Promise<MultipartUploadResult[]> {
  const results: MultipartUploadResult[] = []

  // Process files sequentially to avoid overwhelming the server
  for (const file of files) {
    const result = await uploadFileClientChunked(path, file, onProgress)
    results.push(result)
  }

  return results
}
