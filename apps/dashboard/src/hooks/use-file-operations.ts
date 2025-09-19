import { deleteObjects } from '@/lib/actions'
import { Path } from '@/lib/path'
import { uploadFiles } from '@/lib/upload'
import { ItemUploadProgress } from '@/types/upload'
import { toast } from 'sonner'

export function useFileOperations() {
  const handleUpload = async (
    files: File[],
    currentPath: Path,
    onProgress?: (progress: ItemUploadProgress) => void
  ): Promise<void> => {
    const result = await uploadFiles(currentPath, files, onProgress)
    if (!result.success) {
      toast.error('Failed to upload files', {
        description: result.error,
      })
      return
    }
  }

  const handleDelete = async (keysToDelete: string[], onSuccess?: () => void): Promise<void> => {
    const result = await deleteObjects(keysToDelete)

    if (!result.success) {
      if (result.error.errors && result.error.errors.length > 0) {
        // Show specific errors
        const errorMessages = result.error.errors
          .map((e) => `${e.objectKey}: ${e.error.message}`)
          .join(', ')
        toast.error(`Failed to delete some items`, {
          description: errorMessages,
        })
      } else {
        toast.error('Failed to delete selected items', {
          description: 'Deletion Error',
          action: {
            label: 'Retry',
            onClick: () => handleDelete(keysToDelete, onSuccess),
          },
        })
      }
      // return err(result.error.error || new Error("Unknown deletion error"));
      return
    } else {
      const itemCount = keysToDelete.length
      toast.success(`Successfully deleted ${itemCount} ${itemCount === 1 ? 'item' : 'items'}`, {
        description: 'Items Deleted',
      })

      onSuccess?.()
      // return ok({ itemCount });
      return
    }
  }

  const handleDownload = async (selectedItems: Path[]): Promise<void> => {
    let successCount = 0
    let errorCount = 0
    let skippedFolders = 0

    for (const item of selectedItems) {
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
  }

  return {
    handleUpload,
    handleDelete,
    handleDownload,
  }
}
