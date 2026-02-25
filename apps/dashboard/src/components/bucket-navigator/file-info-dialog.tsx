'use client'

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@r2-drive/ui/components/dialog'
import { formatBytes, formatDate } from '@r2-drive/utils/file-utils'
import { UIR2Item } from '@r2-drive/utils/types/item'
import { Info } from 'lucide-react'

export interface FileInfoDialogProps {
  show: boolean
  onOpenChange: (open: boolean) => void
  item?: UIR2Item | null
}

export function FileInfoDialog({ show, onOpenChange, item }: FileInfoDialogProps) {
  if (!item) return null

  return (
    <Dialog open={show} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Info className="h-5 w-5 text-primary" />
            File Info
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="space-y-1">
            <p className="text-sm font-medium text-muted-foreground">Name</p>
            <p className="text-sm break-all">{item.path.name}</p>
          </div>

          {!item.path.isFolder && (
            <div className="space-y-1">
              <p className="text-sm font-medium text-muted-foreground">Size</p>
              <p className="text-sm">{formatBytes(item.size)}</p>
            </div>
          )}

          {item.lastModified && (
            <div className="space-y-1">
              <p className="text-sm font-medium text-muted-foreground">Modified</p>
              <p className="text-sm">{formatDate(item.lastModified)}</p>
            </div>
          )}

          {item.contentType && (
            <div className="space-y-1">
              <p className="text-sm font-medium text-muted-foreground">Type</p>
              <p className="text-sm">{item.contentType}</p>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
