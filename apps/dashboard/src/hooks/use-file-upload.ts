import { Path } from '@/lib/path'
import { uploadFiles } from '@/lib/upload'
import { type ItemUploadProgress } from '@/types/item'
import { useCallback, useRef, useState } from 'react'
import { toast } from 'sonner'

export interface UseFileUploadState {
  uploadProgress: ItemUploadProgress[]
  fileInputRef: React.RefObject<HTMLInputElement | null>
  folderInputRef: React.RefObject<HTMLInputElement | null>
}

export interface UseFileUploadActions {
  uploadFromHTMLInput: (e: React.ChangeEvent<HTMLInputElement>) => Promise<void>
  uploadFiles: (files: File[]) => Promise<void>
  triggerFileUpload: () => void
  triggerFolderUpload: () => void
  onSuccess?: () => void
}

export interface UseFileUploadProps {
  path: Path
  onFilesChange: () => Promise<void>
}

export function useFileUpload({
  path,
  onFilesChange,
}: UseFileUploadProps): UseFileUploadState & UseFileUploadActions {
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

  const onUploadFiles = useCallback(
    async (files: File[]) => {
      setUploadProgress([]) // Reset progress for new upload session
      const result = await uploadFiles(path, files, handleProgressUpdate)
      if (!result.success) {
        return void toast.error('Failed to upload files', {
          description: result.error,
        })
      } else {
        await onFilesChange()
      }
    },
    [path]
  )

  // Handle file or folder upload from input
  const uploadFromHTMLInput = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      const files = e.target.files
      if (!files || files.length === 0) return
      const fileArray = Array.from(files)
      e.target.value = '' // Reset input for future uploads
      await onUploadFiles(fileArray)
    },
    [onUploadFiles]
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
    uploadFromHTMLInput,
    uploadFiles: onUploadFiles,
    triggerFileUpload,
    triggerFolderUpload,
  }
}
