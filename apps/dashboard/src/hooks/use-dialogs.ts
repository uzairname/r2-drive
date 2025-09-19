import { useState } from 'react'

export interface DialogState {
  showCreateFolderDialog: boolean
}

export interface DialogActions {
  openCreateFolderDialog: () => void
  closeCreateFolderDialog: () => void
  setShowCreateFolderDialog: (show: boolean) => void
}

export function useDialogs(): DialogState & DialogActions {
  const [showCreateFolderDialog, setShowCreateFolderDialog] = useState(false)

  const openCreateFolderDialog = () => {
    setShowCreateFolderDialog(true)
  }

  const closeCreateFolderDialog = () => {
    setShowCreateFolderDialog(false)
  }

  return {
    // State
    showCreateFolderDialog,
    // Actions
    openCreateFolderDialog,
    closeCreateFolderDialog,
    setShowCreateFolderDialog,
  }
}
