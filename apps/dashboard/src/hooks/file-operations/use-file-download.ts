import { getCookie } from '@/lib/cookies'
import {
  checkFolderSize,
  downloadFolderAsZip,
  triggerBlobDownload,
} from '@/lib/download-folder'
import { Path } from '@/lib/path'
import { trpc } from '@/trpc/client'
import { ItemDownloadProgress } from '@r2-drive/utils/types/item'
import { useCallback, useRef, useState } from 'react'
import { toast } from 'sonner'

const TOKEN_COOKIE = 'r2-share-tokens'

export interface DownloadState {
  isDownloading: boolean
  downloadProgress: ItemDownloadProgress[]
  isZipping: boolean
}

export interface DownloadActions {
  downloadItems: (items: Path[]) => Promise<void>
  cancelDownload: () => void
}

export function useFileDownload(): DownloadState & DownloadActions {
  const [isDownloading, setIsDownloading] = useState(false)
  const [downloadProgress, setDownloadProgress] = useState<ItemDownloadProgress[]>([])
  const [isZipping, setIsZipping] = useState(false)
  const abortControllerRef = useRef<AbortController | null>(null)

  const utils = trpc.useUtils()

  const cancelDownload = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort()
      abortControllerRef.current = null
    }
    setIsDownloading(false)
    setDownloadProgress([])
    setIsZipping(false)
  }, [])

  const downloadItems = async (items: Path[]) => {
    if (items.length === 0) return
    setIsDownloading(true)
    setDownloadProgress([])

    const files = items.filter((item) => !item.isFolder)
    const folders = items.filter((item) => item.isFolder)

    let successCount = 0
    let errorCount = 0

    // Download individual files directly
    for (const file of files) {
      try {
        const url = `/api/download?key=${encodeURIComponent(file.key)}`
        const a = document.createElement('a')
        a.href = url
        a.download = file.name
        document.body.appendChild(a)
        a.click()
        document.body.removeChild(a)
        successCount++
      } catch {
        errorCount++
        toast.error(`Failed to download ${file.name}`)
      }
    }

    // Download folders as zip
    for (const folder of folders) {
      try {
        // Get list of all files in folder
        const result = await utils.r2.listRecursive.fetch({ folder })

        if (!result.success || result.data.files.length === 0) {
          toast.info(`Folder "${folder.name}" is empty`)
          continue
        }

        const folderFiles = result.data.files

        // Check size limits
        const sizeCheck = checkFolderSize(folderFiles)
        if (sizeCheck.error) {
          toast.error(sizeCheck.error)
          errorCount++
          continue
        }
        if (sizeCheck.warning) {
          toast.warning(sizeCheck.warning)
        }

        // Set up abort controller
        abortControllerRef.current = new AbortController()

        // Get share tokens from cookie
        const shareTokens = getCookie(TOKEN_COOKIE)

        // Download and zip the folder
        const { blob, fileName } = await downloadFolderAsZip({
          folderPath: folder,
          files: folderFiles,
          shareTokens,
          onProgress: setDownloadProgress,
          abortSignal: abortControllerRef.current.signal,
        })

        setIsZipping(true)
        // Give UI a moment to show zipping state
        await new Promise((resolve) => setTimeout(resolve, 100))

        // Trigger download
        triggerBlobDownload(blob, fileName)
        setIsZipping(false)

        // Check for partial success
        const completed = downloadProgress.filter((p) => p.status === 'completed').length
        const errors = downloadProgress.filter((p) => p.status === 'error').length

        if (errors > 0 && completed > 0) {
          toast.warning(`Downloaded ${completed} files, ${errors} failed`)
        } else {
          successCount++
        }
      } catch (error) {
        if (error instanceof DOMException && error.name === 'AbortError') {
          toast.info('Download cancelled')
        } else {
          toast.error(`Failed to download folder "${folder.name}"`)
          errorCount++
        }
      }
    }

    // Show summary notification for files
    if (files.length > 0 && successCount > 0 && errorCount === 0) {
      toast.success(
        `Started download of ${successCount} ${successCount === 1 ? 'file' : 'files'}`
      )
    }

    // Clean up
    abortControllerRef.current = null
    setIsDownloading(false)
    setDownloadProgress([])
    setIsZipping(false)
  }

  return {
    isDownloading,
    downloadProgress,
    isZipping,
    downloadItems,
    cancelDownload,
  }
}
