import { Path } from '@/lib/path'
import { useCallback, useState } from 'react'

export interface RenameState {
  itemToRename: Path | null
  showRenameDialog: boolean
}

export interface RenameActions {
  setItemToRename: (path: Path | null) => void
  onRenameItem: (path: Path) => void
  setShowRenameDialog: (show: boolean) => void
}

export interface UseFileRenameProps {
  path: Path
  onFilesChange: () => Promise<void>
}

export function useFileRename({ path, onFilesChange }: UseFileRenameProps): RenameState & RenameActions {
  const [itemToRename, setItemToRename] = useState<Path | null>(null)
  const [showRenameDialog, setShowRenameDialog] = useState(false)

  const onRenameItem = useCallback((item: Path) => {
    setItemToRename(item)
    setShowRenameDialog(true)
  }, [])

  const handleDialogOpenChange = useCallback((open: boolean) => {
    setShowRenameDialog(open)
    if (!open) {
      // Clear itemToRename when dialog closes
      setItemToRename(null)
    }
  }, [])

  return {
    // State
    itemToRename,
    showRenameDialog,
    // Actions
    setItemToRename,
    onRenameItem,
    setShowRenameDialog: handleDialogOpenChange,
  }
}
