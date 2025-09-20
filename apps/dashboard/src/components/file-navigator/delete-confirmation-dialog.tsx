'use client'

import { Path } from '@/lib/path'
import { Button } from '@workspace/ui/components/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@workspace/ui/components/dialog'
import { Trash2 } from 'lucide-react'

export interface DeleteConfirmationDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onConfirmDelete: () => Promise<void>
  items: Path[]
  isDeleting?: boolean
}

export function DeleteConfirmationDialog({
  open,
  onOpenChange,
  onConfirmDelete,
  items,
  isDeleting = false,
}: DeleteConfirmationDialogProps) {
  const handleConfirm = async () => {
    await onConfirmDelete()
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Trash2 className="h-5 w-5 text-destructive" />
            Delete {items.length > 1 ? 'Items' : 'Item'}
          </DialogTitle>
          <DialogDescription>
            Are you sure you want to delete the following {items.length > 1 ? 'items' : 'item'}? This
            action cannot be undone.
          </DialogDescription>
        </DialogHeader>

        <div className="max-h-32 overflow-y-auto">
          <ul className="text-sm space-y-1">
            {items.map((item, index) => (
              <li key={index} className="text-foreground font-medium">
                • {item.name}
              </li>
            ))}
          </ul>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isDeleting}>
            Cancel
          </Button>
          <Button variant="destructive" onClick={handleConfirm} disabled={isDeleting}>
            {isDeleting ? 'Deleting...' : 'Delete'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
