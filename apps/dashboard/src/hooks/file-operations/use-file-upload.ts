import { compressFiles } from '@/lib/compress'
import { Path, Paths } from '@/lib/path'
import { uploadFilesSignedURL, uploadFilesViaBinding } from '@/lib/upload'
import { trpc } from '@/trpc/client'
import { PresignedUploadOperations } from '@r2-drive/api/routers/r2/upload'
import { COMPRESSION_CONFIG, USE_PRESIGNED_UPLOADS } from '@r2-drive/utils/app-config'
import { ItemUploadProgress } from '@r2-drive/utils/types/item'
import { useCallback, useRef, useState } from 'react'
import { toast } from 'sonner'

export interface UseFileUploadState {
  uploadProgress: ItemUploadProgress[]
  fileInputRef: React.RefObject<HTMLInputElement | null>
  folderInputRef: React.RefObject<HTMLInputElement | null>
  isUploading: boolean
  isCompressing: boolean

  showOverwriteConfirmDialog: boolean
  overwriteFiles: File[]

  showCompressionDialog: boolean
  compressionFiles: File[]
  shouldCompress: boolean
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
  confirmCompression: () => Promise<void>
  closeCompressionDialog: () => void
  setShowCompressionDialog: (show: boolean) => void
  setShouldCompress: (compress: boolean) => void
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

  // Upload Abort - Track multiple controllers for concurrent uploads
  const abortControllersRef = useRef<Set<AbortController>>(new Set())
  const activeUploadsRef = useRef<number>(0)

  // File overwrite
  const pendingFilesRef = useRef<File[]>([])
  const [showOverwriteConfirmDialog, setShowOverwriteConfirmDialog] = useState(false)
  const [overwriteFiles, setOverwriteFiles] = useState<File[]>([])

  // Compression dialog
  const [showCompressionDialog, setShowCompressionDialog] = useState(false)
  const [compressionFiles, setCompressionFiles] = useState<File[]>([])
  const [shouldCompress, setShouldCompress] = useState(true) // Default checked
  const [isCompressing, setIsCompressing] = useState(false)

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
      abortControllersRef.current.add(abortController)
      activeUploadsRef.current += 1

      try {
        // Determine upload method based on environment
        if (USE_PRESIGNED_UPLOADS) {
          var result = await uploadFilesSignedURL(
            path,
            files,
            operations,
            handleProgressUpdate,
            abortController.signal
          )
        } else {
          toast.warning('Using binding to upload. Only for development. Wont work for large files.')
          result = await uploadFilesViaBinding(path, files, handleProgressUpdate)
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
          console.log('Upload cancelled')
        } else {
          throw error
        }
      } finally {
        // Clean up this upload session
        abortControllersRef.current.delete(abortController)
        activeUploadsRef.current -= 1
        
        // Only set isUploading to false when all uploads are done
        if (activeUploadsRef.current === 0) {
          setIsUploading(false)
        }
      }
    },
    [path, operations, handleProgressUpdate, onFilesChange]
  )

  // Check if files exceed compression thresholds
  const shouldShowCompressionDialog = useCallback((files: File[]) => {
    if (files.length <= 1) return false
    const totalSize = files.reduce((sum, file) => sum + file.size, 0)
    return (
      files.length > COMPRESSION_CONFIG.FILE_COUNT_THRESHOLD ||
      totalSize > COMPRESSION_CONFIG.SIZE_THRESHOLD
    )
  }, [])

  // Proceed with upload after all dialogs are handled
  const proceedWithUpload = useCallback(
    async (files: File[], compress: boolean) => {
      if (compress) {
        try {
          setIsCompressing(true)
          const zipFile = await compressFiles(files)
          setIsCompressing(false)
          setIsUploading(true)
          await doUpload([zipFile])
        } catch (error) {
          setIsCompressing(false)
          toast.error('Failed to compress files', {
            description: error instanceof Error ? error.message : String(error),
          })
        }
      } else {
        setIsUploading(true)
        await doUpload(files)
      }
    },
    [doUpload]
  )

  // When the user attempts to upload files
  const onUploadFiles = useCallback(
    async (files: File[]) => {
      console.log(`Uploading ${files.length} files to ${path.key}. Files: `, files)

      // Check if compression dialog should be shown first
      if (shouldShowCompressionDialog(files)) {
        pendingFilesRef.current = files
        setCompressionFiles(files)
        setShouldCompress(true) // Reset to default checked
        setShowCompressionDialog(true)
        return
      }

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
      // Don't reset progress - append to existing progress for concurrent uploads
      await doUpload(files)
    },
    [path, currentFiles, doUpload, shouldShowCompressionDialog]
  )

  const confirmOverwrite = useCallback(async () => {
    const files = pendingFilesRef.current
    if (files.length === 0) return

    // Don't reset progress - append to existing progress for concurrent uploads
    await proceedWithUpload(files, false)
    pendingFilesRef.current = []
  }, [proceedWithUpload])

  // When user confirms from compression dialog
  const confirmCompression = useCallback(async () => {
    const files = pendingFilesRef.current
    if (files.length === 0) return

    // After compression dialog, check for file conflicts
    // Note: if compressing, we need to check if the zip filename conflicts
    if (shouldCompress) {
      // When compressing, keep dialog open to show progress, then close after
      await proceedWithUpload(files, true)
      setShowCompressionDialog(false)
      setCompressionFiles([])
    } else {
      // Not compressing - close dialog immediately
      setShowCompressionDialog(false)
      setCompressionFiles([])

      // When not compressing, check for existing files
      const existingFiles = files.filter(
        (file) =>
          currentFiles.includes(file.name) || currentFiles.includes(Paths.filePath(path, file).name)
      )

      if (existingFiles.length > 0) {
        // Store files and show overwrite confirmation dialog
        setOverwriteFiles(files)
        setShowOverwriteConfirmDialog(true)
        return
      }

      // No conflicts, proceed with upload
      await proceedWithUpload(files, false)
    }
    pendingFilesRef.current = []
  }, [shouldCompress, currentFiles, path, proceedWithUpload])

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
      // Abort all ongoing local uploads
      abortControllersRef.current.forEach((controller) => {
        if (!controller.signal.aborted) {
          controller.abort('Canceled')
        }
      })
      abortControllersRef.current.clear()

      // Cancel all multipart uploads on the server
      const result = await cancelAll.mutateAsync({})
      if (result.success) {
        console.log(`Cancelled ${result.aborted} out of ${result.total} uploads`)

        // Update progress to show cancelled state
        setUploadProgress([])
        setIsUploading(false)
        activeUploadsRef.current = 0
      }
    } catch (error) {
      console.error('Error cancelling uploads:', error)
      toast.error('Failed to cancel uploads')
    }
  }, [cancelAll])

  const triggerFileUpload = useCallback(() => {
    // Allow triggering uploads even when another upload is in progress
    fileInputRef.current?.click()
  }, [])

  const triggerFolderUpload = useCallback(() => {
    // Allow triggering uploads even when another upload is in progress
    folderInputRef.current?.click()
  }, [])

  const closeOverwriteConfirmDialog = () => {
    setShowOverwriteConfirmDialog(false)
    setOverwriteFiles([])
    pendingFilesRef.current = []
  }

  const closeCompressionDialog = () => {
    setShowCompressionDialog(false)
    setCompressionFiles([])
    pendingFilesRef.current = []
  }

  return {
    // State
    uploadProgress,
    fileInputRef,
    folderInputRef,
    isUploading,
    isCompressing,
    showOverwriteConfirmDialog,
    overwriteFiles,
    showCompressionDialog,
    compressionFiles,
    shouldCompress,
    // Actions
    uploadFromHTMLInput,
    uploadFiles: onUploadFiles,
    confirmOverwrite,
    cancelAllUploads,
    triggerFileUpload,
    triggerFolderUpload,
    closeOverwriteConfirmDialog,
    setShowOverwriteConfirmDialog,
    confirmCompression,
    closeCompressionDialog,
    setShowCompressionDialog,
    setShouldCompress,
  }
}
