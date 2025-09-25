'use client'

import { Button } from '@r2-drive/ui/components/button'
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@r2-drive/ui/components/dialog'
import { formatBytes } from '@r2-drive/utils/file-utils'
import { AlertTriangle } from 'lucide-react'

interface OverwriteConfirmationDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  files: File[]
  onConfirm: () => void
  onCancel: () => void
}

export function OverwriteConfirmationDialog({
  open,
  onOpenChange,
  files,
  onConfirm,
  onCancel,
}: OverwriteConfirmationDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-orange-600">
            <AlertTriangle className="h-5 w-5" />
            Overwrite Existing Files?
          </DialogTitle>
        </DialogHeader>

        <div className="py-4">
          <p className="text-sm text-muted-foreground mb-4">
            The following file{files.length === 1 ? '' : 's'} already exist
            {files.length === 1 ? 's' : ''} in this location:
          </p>

          <div className="max-h-32 overflow-y-auto space-y-1">
            {files.map((file, index) => (
              <div
                key={index}
                className="flex items-center justify-between text-sm bg-muted/50 rounded p-2"
              >
                <span className="font-medium truncate flex-1 mr-2" title={file.name}>
                  {file.name}
                </span>
                <span className="text-muted-foreground text-xs">{formatBytes(file.size)}</span>
              </div>
            ))}
          </div>

          <p className="text-sm text-muted-foreground mt-4">
            Do you want to overwrite {files.length === 1 ? 'this file' : 'these files'}?
          </p>
        </div>

        <DialogFooter className="flex justify-end gap-2">
          <Button
            variant="outline"
            onClick={() => {
              onCancel()
              onOpenChange(false)
            }}
          >
            Cancel
          </Button>
          <Button
            variant="destructive"
            onClick={() => {
              onConfirm()
              onOpenChange(false)
            }}
          >
            Overwrite {files.length === 1 ? 'File' : 'Files'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
