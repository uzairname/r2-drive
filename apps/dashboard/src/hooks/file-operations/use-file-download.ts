import { Path } from '@/lib/path'
import { useState } from 'react'
import { toast } from 'sonner'

export interface DownloadState {
  isDownloading: boolean
}

export interface DownloadActions {
  downloadItems: (items: Path[]) => Promise<void>
}

export function useFileDownload(): DownloadState & DownloadActions {
  const [isDownloading, setIsDownloading] = useState(false)

  const downloadItems = async (items: Path[]) => {
    if (downloadItems.length === 0) return
    setIsDownloading(true)

    let successCount = 0
    let errorCount = 0
    let skippedFolders = 0

    for (const item of items) {
      try {
        // Build the full key for the file
        // For folders, we skip download as they're just markers
        if (item.isFolder) {
          skippedFolders++
          continue
        }

        const url = `/api/download?key=${encodeURIComponent(item.key)}`

        // Create a download link
        const a = document.createElement('a')
        a.href = url
        a.download = item.name
        document.body.appendChild(a)
        a.click()
        document.body.removeChild(a)

        successCount++
      } catch (error) {
        errorCount++
        toast.error(`Failed to download ${item.name}`, {
          description: 'Download Error',
        })
      }
    }

    // Show summary notification
    if (successCount > 0 && errorCount === 0) {
      toast.success(
        `Started download of ${successCount} ${successCount === 1 ? 'file' : 'files'}`,
        { description: 'Download Started' }
      )
    }

    if (skippedFolders > 0) {
      toast.info(
        `Skipped ${skippedFolders} ${skippedFolders === 1 ? 'folder' : 'folders'} (cannot download folders)`,
        { description: 'Download Notice' }
      )
    }

    setIsDownloading(false)
  }

  return {
    isDownloading,
    downloadItems,
  }
}
