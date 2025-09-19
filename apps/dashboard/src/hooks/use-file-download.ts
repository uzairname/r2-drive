import { Path } from '@/lib/path'
import { useCallback, useState } from 'react'

export interface DownloadState {
  isDownloading: boolean
}

export interface DownloadActions {
  downloadItem: (item: Path) => Promise<void>
  downloadMultiple: (items: Path[]) => Promise<void>
}

export function useFileDownload({
  downloadItems,
}: {
  downloadItems: (selectedItems: Path[]) => Promise<unknown>
}): DownloadState & DownloadActions {
  const [isDownloading, setIsDownloading] = useState(false)

  const downloadItem = useCallback(
    async (item: Path) => {
      setIsDownloading(true)
      await downloadItems([item])
      setIsDownloading(false)
    },
    [downloadItems]
  )

  const downloadMultiple = useCallback(
    async (selectedItems: Path[]) => {
      if (selectedItems.length === 0) return
      setIsDownloading(true)
      await downloadItems(selectedItems)
      setIsDownloading(false)
    },
    [downloadItems]
  )

  return {
    isDownloading,
    downloadItem,
    downloadMultiple,
  }
}
