import { ItemDownloadProgress } from '@r2-drive/utils/types/item'
import JSZip from 'jszip'
import pLimit from 'p-limit'
import { Path } from './path'

const CONCURRENT_DOWNLOADS = 4
const SIZE_WARNING_THRESHOLD = 500 * 1024 * 1024 // 500MB
const SIZE_MAX_THRESHOLD = 2 * 1024 * 1024 * 1024 // 2GB

export interface FolderDownloadOptions {
  folderPath: Path
  files: Array<{ key: string; size: number }>
  shareTokens?: string
  onProgress: (progress: ItemDownloadProgress[]) => void
  abortSignal?: AbortSignal
}

export interface FolderDownloadResult {
  blob: Blob
  fileName: string
}

/**
 * Check total size and return appropriate warnings/errors
 */
export function checkFolderSize(files: Array<{ size: number }>): {
  totalSize: number
  warning: string | null
  error: string | null
} {
  const totalSize = files.reduce((sum, f) => sum + f.size, 0)

  if (totalSize > SIZE_MAX_THRESHOLD) {
    return {
      totalSize,
      warning: null,
      error: `Total size (${formatSize(totalSize)}) exceeds 2GB limit. Please download in smaller batches.`,
    }
  }

  if (totalSize > SIZE_WARNING_THRESHOLD) {
    return {
      totalSize,
      warning: `Large download (${formatSize(totalSize)}). This may take a while.`,
      error: null,
    }
  }

  return { totalSize, warning: null, error: null }
}

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`
}

/**
 * Downloads all files in a folder and creates a zip archive on the client.
 * Uses parallel downloads with progress tracking.
 */
export async function downloadFolderAsZip(
  options: FolderDownloadOptions
): Promise<FolderDownloadResult> {
  const { folderPath, files, shareTokens, onProgress, abortSignal } = options

  // Initialize progress for all files
  const progressMap = new Map<string, ItemDownloadProgress>()
  for (const file of files) {
    const fileName = file.key.split('/').pop() || file.key
    progressMap.set(file.key, {
      key: file.key,
      fileName,
      downloadedBytes: 0,
      totalBytes: file.size,
      status: 'pending',
    })
  }

  const emitProgress = () => {
    onProgress(Array.from(progressMap.values()))
  }
  emitProgress()

  const zip = new JSZip()
  const limit = pLimit(CONCURRENT_DOWNLOADS)

  // Download all files in parallel with limited concurrency
  const downloadPromises = files.map((file) =>
    limit(async () => {
      if (abortSignal?.aborted) {
        throw new DOMException('Download aborted', 'AbortError')
      }

      const progress = progressMap.get(file.key)!
      progress.status = 'downloading'
      emitProgress()

      try {
        const arrayBuffer = await downloadFileWithProgress(
          file.key,
          file.size,
          shareTokens,
          (downloadedBytes) => {
            progress.downloadedBytes = downloadedBytes
            emitProgress()
          },
          abortSignal
        )

        // Calculate relative path within the folder
        const relativePath = file.key.startsWith(folderPath.key)
          ? file.key.slice(folderPath.key.length)
          : file.key

        zip.file(relativePath, arrayBuffer)

        progress.status = 'completed'
        progress.downloadedBytes = file.size
        emitProgress()
      } catch (error) {
        progress.status = 'error'
        progress.errorMsg = error instanceof Error ? error.message : 'Download failed'
        emitProgress()
        // Don't throw - continue with other files
      }
    })
  )

  await Promise.all(downloadPromises)

  // Check if we have any successful downloads
  const successfulCount = Array.from(progressMap.values()).filter(
    (p) => p.status === 'completed'
  ).length

  if (successfulCount === 0) {
    throw new Error('All file downloads failed')
  }

  // Generate the zip
  const blob = await zip.generateAsync({
    type: 'blob',
    compression: 'DEFLATE',
    compressionOptions: { level: 6 },
  })

  // Generate filename
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19)
  const folderName = folderPath.name || 'download'
  const fileName = `${folderName}-${timestamp}.zip`

  return { blob, fileName }
}

/**
 * Downloads a single file with progress tracking using fetch and ReadableStream
 */
async function downloadFileWithProgress(
  key: string,
  totalSize: number,
  shareTokens: string | undefined,
  onProgress: (downloadedBytes: number) => void,
  abortSignal?: AbortSignal
): Promise<ArrayBuffer> {
  const url = `/api/download?key=${encodeURIComponent(key)}`

  const headers: HeadersInit = {}
  if (shareTokens) {
    headers['X-Share-Tokens'] = shareTokens
  }

  const response = await fetch(url, {
    headers,
    signal: abortSignal,
  })

  if (!response.ok) {
    throw new Error(`Failed to download: ${response.statusText}`)
  }

  const reader = response.body?.getReader()
  if (!reader) {
    throw new Error('No response body')
  }

  const chunks: Uint8Array[] = []
  let downloadedBytes = 0

  while (true) {
    const { done, value } = await reader.read()

    if (done) break

    if (value) {
      chunks.push(value)
      downloadedBytes += value.length
      onProgress(downloadedBytes)
    }
  }

  // Combine all chunks into a single ArrayBuffer
  const result = new Uint8Array(downloadedBytes)
  let offset = 0
  for (const chunk of chunks) {
    result.set(chunk, offset)
    offset += chunk.length
  }

  return result.buffer
}

/**
 * Triggers a download of a blob as a file
 */
export function triggerBlobDownload(blob: Blob, fileName: string) {
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = fileName
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}
