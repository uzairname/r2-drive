import { Path } from '@/lib/path'
import { uploadFilesSignedURL, uploadFilesViaBinding } from '@/lib/upload'
import { trpc } from '@/trpc/client'
import { PresignedUploadOperations } from '@r2-drive/api/routers/r2/upload'
import { ItemUploadProgress } from '@r2-drive/utils/types/item'
import { useCallback, useRef, useState } from 'react'
import { toast } from 'sonner'

export interface UseFileUploadState {
  uploadProgress: ItemUploadProgress[]
  fileInputRef: React.RefObject<HTMLInputElement | null>
  folderInputRef: React.RefObject<HTMLInputElement | null>
  isUploading: boolean
}

export interface UseFileUploadActions {
  uploadFromHTMLInput: (e: React.ChangeEvent<HTMLInputElement>) => Promise<void>
  uploadFiles: (files: File[]) => Promise<void>
  triggerFileUpload: () => void
  triggerFolderUpload: () => void
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
  const [isUploading, setIsUploading] = useState(false)

  // tRPC mutations
  const prepareUpload = trpc.r2.upload.prepare.useMutation()
  const completeUpload = trpc.r2.upload.complete.useMutation()
  // Create operations object with tRPC mutations
  const operations: PresignedUploadOperations = {
    prepare: (input) => prepareUpload.mutateAsync(input),
    complete: (input) => completeUpload.mutateAsync(input),
  }

  const handleProgressUpdate = useCallback((progress: ItemUploadProgress) => {
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
  }, [])

  const onUploadFiles = useCallback(
    async (files: File[]) => {
      if (isUploading) return

      setIsUploading(true)
      setUploadProgress([]) // Reset progress for new upload session

      try {
        // Determine upload method based on environment
        const isDev = process.env.NODE_ENV === 'development'
        const usePresigned = true
        if (usePresigned) {
          result = await uploadFilesSignedURL(path, files, operations, handleProgressUpdate)
        } else {
          toast.warning('Using binding to upload. Only for development. Wont work for large files.')
          var result = await uploadFilesViaBinding(path, files, handleProgressUpdate)
        }

        if (!result.success) {
          toast.error('Failed to upload files', {
            description: result.error.message || String(result.error),
          })
        } else {
          await onFilesChange()
        }
      } finally {
        setIsUploading(false)
      }
    },
    [path, prepareUpload, completeUpload, onFilesChange, handleProgressUpdate, isUploading]
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

  const triggerFileUpload = useCallback(() => {
    if (!isUploading) {
      fileInputRef.current?.click()
    }
  }, [isUploading])

  const triggerFolderUpload = useCallback(() => {
    if (!isUploading) {
      folderInputRef.current?.click()
    }
  }, [isUploading])

  return {
    // State
    uploadProgress,
    fileInputRef,
    folderInputRef,
    isUploading,
    // Actions
    uploadFromHTMLInput,
    uploadFiles: onUploadFiles,
    triggerFileUpload,
    triggerFolderUpload,
  }
}
