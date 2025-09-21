'use client'

import { Button } from '@r2-drive/ui/components/button'
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@r2-drive/ui/components/dialog'
import { Input } from '@r2-drive/ui/components/input'
import { useEffect, useState } from 'react'

interface CreateFolderDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onCreateFolder: (folderName: string) => Promise<{ success: boolean; errorMessage?: string }>
}

export function CreateFolderDialog({
  open,
  onOpenChange,
  onCreateFolder,
}: CreateFolderDialogProps) {
  const [folderName, setFolderName] = useState('')
  const [isCreating, setIsCreating] = useState(false)
  const [serverError, setServerError] = useState<string | null>(null)
  const [validationError, setValidationError] = useState<string | null>(null)

  // Real-time validation as user types
  useEffect(() => {
    if (folderName === '') {
      setValidationError(null)
      return
    }

    const trimmedName = folderName.trim()

    if (!trimmedName) {
      setValidationError('Folder name cannot be empty')
      return
    }

    // Check for invalid characters
    const invalidChars = folderName.match(/[<>:"/\\|?*]/g)
    if (invalidChars) {
      const uniqueChars = [...new Set(invalidChars)].join(', ')
      setValidationError(`Invalid characters: ${uniqueChars}`)
      return
    }

    // Check for leading/trailing spaces
    if (folderName !== trimmedName) {
      setValidationError('Folder name cannot start or end with spaces')
      return
    }

    // Check length (reasonable limit)
    if (trimmedName.length > 255) {
      setValidationError('Folder name is too long (max 255 characters)')
      return
    }

    setValidationError(null)
  }, [folderName])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!folderName.trim() || validationError || isCreating) return

    setIsCreating(true)
    setServerError(null)

    try {
      const result = await onCreateFolder(folderName.trim())
      if (result.success) {
        setFolderName('')
        setValidationError(null)
        onOpenChange(false)
      } else {
        setServerError(result.errorMessage || 'Failed to create folder')
      }
    } catch (err) {
      setServerError('An unexpected error occurred')
    } finally {
      setIsCreating(false)
    }
  }

  const handleOpenChange = (newOpen: boolean) => {
    if (!isCreating) {
      if (!newOpen) {
        setFolderName('')
        setValidationError(null)
        setServerError(null)
      }
      onOpenChange(newOpen)
    }
  }

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFolderName(e.target.value)
    // Clear server error when user starts typing again
    if (serverError) {
      setServerError(null)
    }
  }

  const hasError = validationError || serverError
  const canSubmit = folderName.trim() && !validationError && !isCreating

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Create New Folder</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Input
                id="folder-name"
                type="text"
                placeholder="Enter folder name"
                value={folderName}
                onChange={handleInputChange}
                disabled={isCreating}
                autoFocus
                className={hasError ? 'border-destructive focus-visible:ring-destructive/20' : ''}
              />
              {validationError && (
                <p className="text-sm text-destructive animate-in slide-in-from-top-1">
                  {validationError}
                </p>
              )}
              {serverError && (
                <p className="text-sm text-destructive animate-in slide-in-from-top-1">
                  {serverError}
                </p>
              )}
            </div>
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => handleOpenChange(false)}
              disabled={isCreating}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={!canSubmit}>
              Create
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
