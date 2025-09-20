import { Path, Paths } from '@/lib/path'
import { deleteObjects } from '@/lib/r2'
import { R2Item } from '@/types/item'
import { useCallback, useState } from 'react'
import { toast } from 'sonner'

export interface DeleteState {
  isDeleting: boolean
  showDeleteDialog: boolean
  itemsToDelete: Path[]
}

export interface DeleteActions {
  onDeleteItems: (keys: string[], items: R2Item[]) => void
  onDeleteItem: (path: Path) => void
  onConfirmDelete: () => Promise<void>
  setShowDeleteDialog: (show: boolean) => void
}

export interface UseFileDeleteProps {
  onFilesChange: () => Promise<void>
}

export function useFileDelete({ onFilesChange }: UseFileDeleteProps): DeleteState & DeleteActions {
  const [isDeleting, setIsDeleting] = useState(false)
  const [showDeleteDialog, setShowDeleteDialog] = useState(false)
  const [itemsToDelete, setItemsToDelete] = useState<Path[]>([])

  const onDeleteItems = (selectedItems: string[]) => {
    if (selectedItems.length === 0) return
    setItemsToDelete(selectedItems.map(Paths.fromR2Key))
    setShowDeleteDialog(true)
  }

  const onDeleteItem = (path: Path) => {
    setItemsToDelete([path])
    setShowDeleteDialog(true)
  }

  const onConfirmDelete = useCallback(async () => {
    setIsDeleting(true)
    const result = await deleteObjects(itemsToDelete)
    setItemsToDelete([])

    if (!result.success) {
      toast.error(`Failed to delete`, { description: result.error.message })
    } else {
      const itemCount = itemsToDelete.length
      toast.success(`Successfully deleted ${itemCount} ${itemCount === 1 ? 'item' : 'items'}`)
      await onFilesChange()
    }
    setIsDeleting(false)
    setShowDeleteDialog(false)
  }, [itemsToDelete])

  return {
    // State
    itemsToDelete,
    // Actions
    onDeleteItems,
    onDeleteItem,
    onConfirmDelete,

    // Dialog
    isDeleting,
    showDeleteDialog,
    setShowDeleteDialog,
  }
}
