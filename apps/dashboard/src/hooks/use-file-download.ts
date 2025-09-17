import { useState, useCallback } from "react";

export interface DownloadState {
  isDownloading: boolean;
}

export interface DownloadActions {
  onDownloadItem: (itemId: string, itemName: string) => Promise<void>;
  onDownloadSelected: (selectedItems: string[]) => Promise<void>;
}

export interface UseFileDownloadProps {
  onDownload: (itemIds: string[]) => Promise<void>;
}

export function useFileDownload({ onDownload }: UseFileDownloadProps): DownloadState & DownloadActions {
  const [isDownloading, setIsDownloading] = useState(false);

  const onDownloadItem = useCallback(async (itemId: string, itemName: string) => {
    try {
      await onDownload([itemId]);
    } catch (error) {
      console.error("Error downloading item:", error);
    }
  }, [onDownload]);

  const onDownloadSelected = useCallback(async (selectedItems: string[]) => {
    if (selectedItems.length === 0) return;
    
    setIsDownloading(true);
    try {
      await onDownload(selectedItems);
    } catch (error) {
      console.error("Error downloading items:", error);
    } finally {
      setIsDownloading(false);
    }
  }, [onDownload]);

  return {
    // State
    isDownloading,
    // Actions
    onDownloadItem,
    onDownloadSelected,
  };
}