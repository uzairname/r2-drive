'use client'

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
  itemNames: string[]
  isDeleting?: boolean
}

export function DeleteConfirmationDialog({
  open,
  onOpenChange,
  onConfirmDelete,
  itemNames,
  isDeleting = false,
}: DeleteConfirmationDialogProps) {
  const handleConfirm = async () => {
    await onConfirmDelete()
    onOpenChange(false)
  }

  const itemCount = itemNames.length
  const isMultiple = itemCount > 1

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Trash2 className="h-5 w-5 text-destructive" />
            Delete {isMultiple ? 'Items' : 'Item'}
          </DialogTitle>
          <DialogDescription>
            Are you sure you want to delete the following {isMultiple ? 'items' : 'item'}? This
            action cannot be undone.
          </DialogDescription>
        </DialogHeader>

        <div className="max-h-32 overflow-y-auto">
          <ul className="text-sm space-y-1">
            {itemNames.map((name, index) => (
              <li key={index} className="text-foreground font-medium">
                • {name}
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
