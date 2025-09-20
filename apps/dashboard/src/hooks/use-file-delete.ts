import { Path, Paths } from '@/lib/path'
import { R2Item } from '@/lib/r2'
import { useCallback, useState } from 'react'

export interface DeleteState {
  isDeleting: boolean
  showDeleteDialog: boolean
  itemsToDelete: Path[]
}

export interface DeleteActions {
  onDeleteSelected: (selectedItems: string[], items: R2Item[]) => void
  onDeleteItem: (path: Path) => void
  handleConfirmDelete: () => Promise<void>
  setShowDeleteDialog: (show: boolean) => void
}

export interface UseFileDeleteProps {
  onDelete: (items: Path[]) => Promise<void>
}

export function useFileDelete({ onDelete }: UseFileDeleteProps): DeleteState & DeleteActions {
  const [isDeleting, setIsDeleting] = useState(false)
  const [showDeleteDialog, setShowDeleteDialog] = useState(false)
  const [itemsToDelete, setItemsToDelete] = useState<Path[]>([])

  const onDeleteSelected = (selectedItems: string[]) => {
    if (selectedItems.length === 0) return
    setItemsToDelete(selectedItems.map(Paths.fromR2Key))
    setShowDeleteDialog(true)
  }

  const onDeleteItem = (path: Path) => {
    setItemsToDelete([path])
    setShowDeleteDialog(true)
  }

  const handleConfirmDelete = useCallback(async () => {
    setIsDeleting(true)
    try {
      await onDelete(itemsToDelete)
    } catch (error) {
      console.error('Error deleting items:', error)
    } finally {
      setIsDeleting(false)
      setItemsToDelete([])
      setShowDeleteDialog(false)
    }
  }, [itemsToDelete, onDelete])

  return {
    // State
    isDeleting,
    showDeleteDialog,
    itemsToDelete,
    // Actions
    onDeleteSelected,
    onDeleteItem,
    handleConfirmDelete,
    setShowDeleteDialog,
  }
}
