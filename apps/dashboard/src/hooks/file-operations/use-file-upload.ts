import { Path, Paths } from '@/lib/path'
import { uploadFilesSignedURL, uploadFilesViaBinding } from '@/lib/upload'
import { trpc } from '@/trpc/client'
import { PresignedUploadOperations } from '@r2-drive/api/routers/r2/upload'
import { USE_PRESIGNED_UPLOADS } from '@r2-drive/utils/app-config'
import { ItemUploadProgress } from '@r2-drive/utils/types/item'
import { useCallback, useRef, useState } from 'react'
import { toast } from 'sonner'

export interface UseFileUploadState {
  uploadProgress: ItemUploadProgress[]
  fileInputRef: React.RefObject<HTMLInputElement | null>
  folderInputRef: React.RefObject<HTMLInputElement | null>
  isUploading: boolean

  showOverwriteConfirmDialog: boolean
  overwriteFiles: File[]
}

export interface UseFileUploadActions {
  uploadFromHTMLInput: (e: React.ChangeEvent<HTMLInputElement>) => Promise<void>
  uploadFiles: (files: File[]) => Promise<void>
  confirmOverwrite: () => Promise<void>
  cancelAllUploads: () => Promise<void>
  triggerFileUpload: () => void
  triggerFolderUpload: () => void
  closeOverwriteConfirmDialog: () => void
  setShowOverwriteConfirmDialog: (show: boolean) => void
}

export interface UseFileUploadProps {
  path: Path
  onFilesChange: () => Promise<void>
  currentFiles: string[] // List of existing file names in the current path
}

export function useFileUpload({
  path,
  onFilesChange,
  currentFiles,
}: UseFileUploadProps): UseFileUploadState & UseFileUploadActions {
  const [uploadProgress, setUploadProgress] = useState<ItemUploadProgress[]>([])
  const [isUploading, setIsUploading] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const folderInputRef = useRef<HTMLInputElement>(null)

  // Upload Abort
  const abortControllerRef = useRef<AbortController | null>(null)

  // File overwrite
  const pendingFilesRef = useRef<File[]>([])
  const [showOverwriteConfirmDialog, setShowOverwriteConfirmDialog] = useState(false)
  const [overwriteFiles, setOverwriteFiles] = useState<File[]>([])

  // tRPC mutations
  const prepareUpload = trpc.r2.upload.prepare.useMutation()
  const completeUpload = trpc.r2.upload.complete.useMutation()
  const cancelAll = trpc.r2.upload.cancelAll.useMutation()

  // Create operations object with tRPC mutations
  const operations: PresignedUploadOperations = {
    prepare: (input) => prepareUpload.mutateAsync(input),
    complete: (input) => completeUpload.mutateAsync(input),
  }

  const handleProgressUpdate = useCallback((progress: ItemUploadProgress) => {
    console.log('handle progress update:', progress)
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

  const doUpload = useCallback(
    async (files: File[]) => {
      // Create new AbortController for this upload session
      const abortController = new AbortController()
      abortControllerRef.current = abortController

      try {
        // Determine upload method based on environment
        if (USE_PRESIGNED_UPLOADS) {
          result = await uploadFilesSignedURL(
            path,
            files,
            operations,
            handleProgressUpdate,
            abortController.signal
          )
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
      } catch (error) {
        if (abortController.signal.aborted) {
          toast.info('Upload cancelled')
        } else {
          throw error
        }
      } finally {
        setIsUploading(false)
        abortControllerRef.current = null
      }
    },
    [path, operations, handleProgressUpdate, onFilesChange]
  )

  // When the user attempts to upload files
  const onUploadFiles = useCallback(
    async (files: File[]) => {
      if (isUploading) return

      // Check for existing files
      const existingFiles = files.filter(
        (file) =>
          currentFiles.includes(file.name) || currentFiles.includes(Paths.filePath(path, file).name)
      )

      if (existingFiles.length > 0) {
        // Store files and show confirmation dialog
        pendingFilesRef.current = files
        setOverwriteFiles(files)
        setShowOverwriteConfirmDialog(true)
        return
      }

      // No conflicts, proceed with upload
      setIsUploading(true)
      setUploadProgress([]) // Reset progress for new upload session
      await doUpload(files)
    },
    [path, currentFiles, isUploading, doUpload, setOverwriteFiles, setShowOverwriteConfirmDialog]
  )

  const confirmOverwrite = useCallback(async () => {
    const files = pendingFilesRef.current
    if (files.length === 0) return

    setIsUploading(true)
    setUploadProgress([]) // Reset progress for new upload session
    await doUpload(files)
    pendingFilesRef.current = []
  }, [doUpload])

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

  const cancelAllUploads = useCallback(async () => {
    try {
      // Abort local uploads
      if (abortControllerRef.current && !abortControllerRef.current.signal.aborted) {
        abortControllerRef.current.abort('Canceled')
      }

      // Cancel all multipart uploads on the server
      const result = await cancelAll.mutateAsync({})
      if (result.success) {
        toast.info(`Cancelled ${result.aborted} out of ${result.total} uploads`)

        // Update progress to show cancelled state
        setUploadProgress([])
      }
    } catch (error) {
      console.error('Error cancelling uploads:', error)
      toast.error('Failed to cancel uploads')
    }
  }, [cancelAll])

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

  const closeOverwriteConfirmDialog = () => {
    setShowOverwriteConfirmDialog(false)
    setOverwriteFiles([])
  }

  return {
    // State
    uploadProgress,
    fileInputRef,
    folderInputRef,
    isUploading,
    showOverwriteConfirmDialog,
    overwriteFiles,
    // Actions
    uploadFromHTMLInput,
    uploadFiles: onUploadFiles,
    confirmOverwrite,
    cancelAllUploads,
    triggerFileUpload,
    triggerFolderUpload,
    closeOverwriteConfirmDialog,
    setShowOverwriteConfirmDialog,
  }
}
