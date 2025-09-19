import { Path } from '@/lib/path'
import { type ItemUploadProgress } from '@/types/upload'
import { useCallback, useRef, useState } from 'react'

export interface UploadState {
  uploadProgress: ItemUploadProgress[]
  fileInputRef: React.RefObject<HTMLInputElement | null>
  folderInputRef: React.RefObject<HTMLInputElement | null>
}

export interface UploadActions {
  upload: (e: React.ChangeEvent<HTMLInputElement>) => Promise<void>
  uploadFiles: (files: File[]) => Promise<void>
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

  // Handle direct file upload (for drag and drop)
  const uploadFiles = useCallback(
    async (files: File[]) => {
      setUploadProgress([]) // Reset progress for new upload session
      await onUpload(files, currentPath, handleProgressUpdate)
    },
    [onUpload, currentPath]
  )

  // Handle file or folder upload from input
  const upload = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      const files = e.target.files
      if (!files || files.length === 0) return
      const fileArray = Array.from(files)
      e.target.value = '' // Reset input for future uploads
      await uploadFiles(fileArray)
    },
    [uploadFiles]
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
    uploadFiles,
    triggerFileUpload,
    triggerFolderUpload,
  }
}
