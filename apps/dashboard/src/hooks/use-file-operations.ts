import { Path } from '@/lib/path'
import { toast } from 'sonner'
import { useFileDelete } from './use-file-delete'
import { useFileDownload } from './use-file-download'
import { useFileUpload } from './use-file-upload'

export function useFileOperations({
  path,
  onFilesChange,
}: {
  path: Path
  onFilesChange: () => Promise<void>
}) {
  // UPLOAD
  const upload = useFileUpload({
    path,
    onFilesChange,
  })

  // DELETE
  const deleteProps = useFileDelete({ onFilesChange })

  // DOWNLOAD
  const download = useFileDownload({
    downloadItems: async (items: Path[]) => {
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
      return
    },
  })

  return {
    upload,
    delete: deleteProps,
    download,
  }
}
