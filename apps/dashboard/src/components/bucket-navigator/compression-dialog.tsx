'use client'

import { Button } from '@r2-drive/ui/components/button'
import { Checkbox } from '@r2-drive/ui/components/checkbox'
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@r2-drive/ui/components/dialog'
import { formatBytes } from '@r2-drive/utils/file-utils'
import { Archive, Loader2 } from 'lucide-react'

interface CompressionDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  files: File[]
  shouldCompress: boolean
  onShouldCompressChange: (checked: boolean) => void
  onConfirm: () => void
  onCancel: () => void
  isCompressing?: boolean
}

export function CompressionDialog({
  open,
  onOpenChange,
  files,
  shouldCompress,
  onShouldCompressChange,
  onConfirm,
  onCancel,
  isCompressing = false,
}: CompressionDialogProps) {
  const totalSize = files.reduce((sum, file) => sum + file.size, 0)

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-primary">
            <Archive className="h-5 w-5" />
            Compress before upload?
          </DialogTitle>
        </DialogHeader>

        <div className="py-4">
          <p className="text-sm text-muted-foreground mb-4">
            You&apos;re about to upload <span className="font-medium">{files.length} files</span>{' '}
            totaling <span className="font-medium">{formatBytes(totalSize)}</span>.
          </p>

          <label className="flex items-start gap-3 p-3 bg-muted/50 rounded-lg cursor-pointer">
            <Checkbox
              checked={shouldCompress}
              onCheckedChange={(checked) => onShouldCompressChange(checked === true)}
              className="mt-0.5"
            />
            <div className="flex-1">
              <span className="text-sm font-medium">Compress files into a .zip archive</span>
              <p className="text-xs text-muted-foreground mt-1">
                {files.length} files → 1 file
              </p>
            </div>
          </label>
        </div>

        <DialogFooter className="flex justify-end gap-2">
          <Button
            variant="outline"
            onClick={() => {
              onCancel()
              onOpenChange(false)
            }}
            disabled={isCompressing}
          >
            Cancel
          </Button>
          <Button onClick={onConfirm} disabled={isCompressing}>
            {isCompressing ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Compressing...
              </>
            ) : (
              'Upload'
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
