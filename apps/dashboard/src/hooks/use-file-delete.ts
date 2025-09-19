import { Path } from "@/lib/path";
import { R2Item } from "@/lib/r2-client";
import { useState, useCallback } from "react";

export interface DeleteState {
  isDeleting: boolean;
  showDeleteDialog: boolean;
  itemsToDelete: { ids: string[]; names: string[] };
}

export interface DeleteActions {
  onDeleteSelected: (selectedItems: string[], items: R2Item[]) => void;
  onDeleteItem: (path: Path) => void;
  handleConfirmDelete: () => Promise<void>;
  setShowDeleteDialog: (show: boolean) => void;
}

export interface UseFileDeleteProps {
  onDelete: (itemIds: string[]) => Promise<void>;
}

export function useFileDelete({ onDelete }: UseFileDeleteProps): DeleteState & DeleteActions {
  const [isDeleting, setIsDeleting] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [itemsToDelete, setItemsToDelete] = useState<{ ids: string[]; names: string[] }>({
    ids: [],
    names: []
  });

  const onDeleteSelected = (selectedItems: string[], items: R2Item[]) => {
    if (selectedItems.length === 0) return;
    
    const selectedItemNames = items
      .filter(item => selectedItems.includes(item.path.key))
      .map(item => item.path.name);
    
    setItemsToDelete({ ids: selectedItems, names: selectedItemNames });
    setShowDeleteDialog(true);
  };

  const onDeleteItem = (path: Path) => {
    setItemsToDelete({ ids: [path.key], names: [path.name] });
    setShowDeleteDialog(true);
  };

  const handleConfirmDelete = useCallback(async () => {
    setIsDeleting(true);
    try {
      await onDelete(itemsToDelete.ids);
    } catch (error) {
      console.error("Error deleting items:", error);
    } finally {
      setIsDeleting(false);
      setItemsToDelete({ ids: [], names: [] });
      setShowDeleteDialog(false);
    }
  }, [itemsToDelete.ids, onDelete]);

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
  };
}