import { Path } from '@/lib/path'
import type { ItemUploadProgress } from '@workspace/ui/components/upload-progress'
import { useCallback, useRef, useState } from 'react'

export interface UploadState {
  uploadProgress: ItemUploadProgress[]
  fileInputRef: React.RefObject<HTMLInputElement | null>
  folderInputRef: React.RefObject<HTMLInputElement | null>
}

export interface UploadActions {
  upload: (e: React.ChangeEvent<HTMLInputElement>) => Promise<void>
  triggerFileUpload: () => void
  triggerFolderUpload: () => void
  onSuccess?: () => void
}

export interface UseFileUploadProps {
  currentPath: Path
  onUpload: (
    files: File[],
    currentPath: Path,
    onProgress?: (progress: ItemUploadProgress) => void
  ) => Promise<void>
}

export function useFileUpload({
  currentPath,
  onUpload,
}: UseFileUploadProps): UploadState & UploadActions {
  const fileInputRef = useRef<HTMLInputElement>(null)
  const folderInputRef = useRef<HTMLInputElement>(null)
  const [uploadProgress, setUploadProgress] = useState<ItemUploadProgress[]>([])

  const handleProgressUpdate = (progress: ItemUploadProgress) => {
    setUploadProgress((prev) => {
      const updated = [...prev]
      const index = updated.findIndex((item) => item.fileName === progress.fileName)
      if (index >= 0) {
        updated[index] = progress
      } else {
        updated.push(progress)
      }
      return updated
    })
  }

  // Handle file or folder upload
  const upload = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      const files = e.target.files
      if (!files || files.length === 0) return
      const fileArray = Array.from(files)
      setUploadProgress(
        fileArray.map((file) => ({
          fileName: file.name,
          progress: 0,
          completed: false,
        }))
      )

      await onUpload(fileArray, currentPath, handleProgressUpdate)
      // Reset the input value to allow uploading the same files again
      e.target.value = ''
    },
    [onUpload, currentPath]
  )

  const triggerFileUpload = () => {
    fileInputRef.current?.click()
  }

  const triggerFolderUpload = () => {
    folderInputRef.current?.click()
  }

  return {
    // State
    uploadProgress,
    fileInputRef,
    folderInputRef,
    // Actions
    upload,
    triggerFileUpload,
    triggerFolderUpload,
  }
}
