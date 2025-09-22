'use client'

import { type PresignedUploadOperations } from '@r2-drive/api/routers/r2/upload'
import { UPLOAD_CONFIG } from '@r2-drive/utils/app-config'
import { Result, safeAsync } from '@r2-drive/utils/result'
import { ItemUploadProgress } from '@r2-drive/utils/types/item'
import pLimit from 'p-limit'
import { putObject } from './actions'
import { Path, Paths } from './path'

/**
 * Uploads files to R2 by sending them to the backend, which then uses the R2 binding
 */
export async function uploadFilesViaBinding(
  path: Path,
  files: File[],
  onProgress?: (progress: ItemUploadProgress) => void
): Promise<Result> {
  return safeAsync(async () => {
    // Separate files by upload method
    const regularFiles = files.filter((file) => file.size <= UPLOAD_CONFIG.MULTIPART_CHUNK_SIZE)
    const multipartFiles = files.filter((file) => file.size > UPLOAD_CONFIG.MULTIPART_CHUNK_SIZE)

    if (multipartFiles.length > 0) {
      await uploadFilesMultipart(path, multipartFiles)
    }

    if (regularFiles.length > 0) {
      const limit = pLimit(UPLOAD_CONFIG.MAX_CONCURRENT_UPLOADS)
      await Promise.all(
        regularFiles.map((file) => limit(() => uploadSmallFile(path, file, onProgress)))
      )
    }
  })
}

async function uploadSmallFile(
  path: Path,
  file: File,
  onProgress?: (progress: ItemUploadProgress) => void
) {
  // Construct the full upload path using webkitRelativePath for folder uploads
  const key = Paths.filePath(path, file).key

  // Use regular server-side upload for smaller files
  console.log(`Using regular upload for file: ${file.name} (${file.size} bytes)`)

  // Upload the file on the server
  const buffer = await file.arrayBuffer()
  const totalBytes = buffer.byteLength
  const contentType = file.type || 'application/octet-stream'

  const lastModified = new Date(file.lastModified)

  onProgress?.({
    fileName: file.name,
    uploadedBytes: 0,
    totalBytes,
    isMultipart: false,
  })

  const result = await putObject(key, file, { 
    contentType,
    lastModified, 
  })

  if (result.success) {
    onProgress?.({
      fileName: file.name,
      uploadedBytes: file.size,
      totalBytes: file.size,
      success: true,
      isMultipart: false,
    })
  } else {
    const errorMsg = result.error instanceof Error ? result.error.message : String(result.error)
    onProgress?.({
      fileName: file.name,
      uploadedBytes: 0,
      totalBytes: file.size,
      success: false,
      isMultipart: false,
      errorMsg,
    })
  }

  return result
}

export async function uploadFilesMultipart(path: Path, files: File[]) {
  for (const file of files) {
    const result = uploadFileMultipart(Paths.filePath(path, file), file)
  }
}

async function uploadFileMultipart(path: Path, file: File): Promise<Result<void, string>> {
  throw new Error('Not implemented')
}

/**
 * Upload files to R2 using presigned URLs obtained from the backend.
 * Supports both single-part and multi-part uploads based on file size.
 * Reports upload progress via the onProgress callback.
 * @param folder - The destination folder path in R2
 * @param files - Array of File objects to upload
 * @param operations - Object containing prepare and complete functions for presigned uploads
 * @param onProgress - Optional callback to receive upload progress updates
 * @returns Result indicating success or failure with an error message
 */
export async function uploadFilesSignedURL(
  folder: Path,
  files: File[],
  operations: PresignedUploadOperations,
  onProgress?: (progress: ItemUploadProgress) => void
): Promise<Result> {
  return safeAsync(async () => {
    // Throw error if duplicate file keys are found
    const fileKeys = files.map((f) => Paths.filePath(folder, f).key)
    const duplicatesExist = new Set(fileKeys).size !== fileKeys.length
    if (duplicatesExist) {
      throw new Error('Attempted to upload files with duplicate keys to the same folder')
    }

    const chunkSize = UPLOAD_CONFIG.MULTIPART_CHUNK_SIZE
    const maxConcurrentUploads = UPLOAD_CONFIG.MAX_CONCURRENT_UPLOADS

    // Report initial progress for all files
    files.forEach((file) => {
      onProgress?.({
        fileName: file.name,
        uploadedBytes: 0,
        totalBytes: file.size,
        isMultipart: file.size > chunkSize,
      })
    })

    // 1. Get presigned URLs

    // Files that will be uploaded in a single part
    const smallFiles = files.filter((file) => file.size <= chunkSize)
    // Files that will be uploaded in multiple parts
    const largeFiles = files.filter((file) => file.size > chunkSize)

    const prepareOptions = {
      smallFiles: smallFiles.map((file) => ({
        key: Paths.filePath(folder, file).key,
        metadata: {
          contentType: file.type || 'application/octet-stream',
          lastModified: file.lastModified,
          dateCreated: file.lastModified, // Use lastModified as dateCreated fallback
        },
      })),
      largeFiles: largeFiles.map((file) => ({
        key: Paths.filePath(folder, file).key,
        partCount: Math.ceil(file.size / chunkSize),
        metadata: {
          contentType: file.type || 'application/octet-stream',
          lastModified: file.lastModified,
          dateCreated: file.lastModified, // Use lastModified as dateCreated fallback
        },
      })),
    }

    const { singleUploads, multiPartUploads } = await operations.prepare(prepareOptions)

    // 2. Upload files

    const limit = pLimit(maxConcurrentUploads)

    const singlepartPromises = smallFiles.map((file) => {
      const uploadInfo = singleUploads.find((u) => u.key === Paths.filePath(folder, file).key)
      if (!uploadInfo?.url) return Promise.resolve()

      console.log('Uploading small file to URL:', uploadInfo.url)

      return limit(() =>
        fetch(uploadInfo.url, {
          method: 'PUT',
          body: file,
          headers: uploadInfo.headers || {},
        }).then((res) => {
          onProgress?.({
            fileName: file.name,
            uploadedBytes: file.size,
            totalBytes: file.size,
            success: res.ok,
            isMultipart: false,
            errorMsg: res.ok ? undefined : `Upload failed with status ${res.status}`,
          })
        })
      )
    })

    await Promise.all(singlepartPromises)

    const largeFilesProgress = largeFiles.map((file) => ({
      fileName: file.name,
      totalBytes: file.size,
      uploadedBytes: 0,
    }))

    const multipartPromises = largeFiles
      .map((file) => {
        const fileUploadInfo = multiPartUploads.find(
          (u) => u.key === Paths.filePath(folder, file).key
        )
        if (!fileUploadInfo) throw new Error(`Missing upload info for file ${file.name}`)

        const partPromises = fileUploadInfo.partUrls.map((url: string, index: number) => {
          return limit(async () => {
            const chunk = file.slice(
              index * chunkSize,
              Math.min((index + 1) * chunkSize, file.size)
            )
            const response = await fetch(url, {
              method: 'PUT',
              body: chunk,
            })
            const etag = response.headers.get('ETag')?.replace(/"/g, '')
            if (!etag)
              throw new Error(`Missing ETag in response for part ${index + 1} of file ${file.name}`)

            // Bytes uploaded in this chunk
            const currentChunkSize = chunk.size

            // Update progress
            const progressInfo = largeFilesProgress.find((p) => p.fileName === file.name)
            if (progressInfo) {
              progressInfo.uploadedBytes += currentChunkSize
              onProgress?.({
                fileName: file.name,
                totalBytes: progressInfo.totalBytes,
                uploadedBytes: progressInfo.uploadedBytes,
                isMultipart: true,
              })
            }

            return {
              key: fileUploadInfo.key,
              partNumber: index + 1,
              uploadId: fileUploadInfo.uploadId,
              etag,
              fileSize: file.size,
            }
          })
        })

        return partPromises
      })
      .flat()

    const multipartCompletions = await Promise.all(multipartPromises)

    if (multipartPromises.length > 0) {
      // Group parts by uploadId
      const completionMap: Record<
        string,
        {
          key: string
          uploadId: string
          parts: { partNumber: number; etag: string }[]
          fileSize: number
        }
      > = {}
      for (const part of multipartCompletions) {
        if (!completionMap[part.uploadId]) {
          completionMap[part.uploadId] = {
            key: part.key,
            uploadId: part.uploadId,
            parts: [],
            fileSize: part.fileSize,
          }
        }
        completionMap[part.uploadId]!.parts.push({ partNumber: part.partNumber, etag: part.etag })
      }

      // Complete multipart uploads using provided operations
      const completionPromises = Object.values(completionMap).map(
        ({ key, uploadId, parts, fileSize }) => {
          return limit(async () => {
            try {
              await operations.complete({ key, uploadId, parts })
              onProgress?.({
                fileName: Paths.fromR2Key(key).name,
                uploadedBytes: fileSize,
                totalBytes: fileSize,
                success: true,
                isMultipart: true,
              })
            } catch (error) {
              onProgress?.({
                fileName: Paths.fromR2Key(key).name,
                uploadedBytes: fileSize,
                totalBytes: fileSize,
                success: false,
                isMultipart: true,
                errorMsg: error instanceof Error ? error.message : 'Completion failed',
              })
            }
          })
        }
      )

      await Promise.all(completionPromises)
    }
  })
}
