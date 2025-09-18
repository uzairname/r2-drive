import { Path } from "@/lib/path-system/path";
import { useState, useCallback } from "react";

export interface DownloadState {
  isDownloading: boolean;
}

export interface DownloadActions {
  downloadItem: (item: Path) => Promise<void>;
  downloadMultiple: (items: Path[]) => Promise<void>;
}

export function useFileDownload({ downloadItems }: {
  downloadItems: (selectedItems: Path[]) => Promise<unknown>;
}): DownloadState & DownloadActions {
  const [isDownloading, setIsDownloading] = useState(false);

  const downloadItem = useCallback(async (item: Path) => {
    try {
      await downloadItems([item]);
    } catch (error) {
      console.error("Error downloading item:", error);
    }
  }, [downloadItems]);

  const downloadMultiple = useCallback(async (selectedItems: Path[]) => {
    if (selectedItems.length === 0) return;
    
    setIsDownloading(true);
    try {
      await downloadItems(selectedItems);
    } catch (error) {
      console.error("Error downloading items:", error);
    } finally {
      setIsDownloading(false);
    }
  }, [downloadItems]);

  return {
    isDownloading,
    downloadItem,
    downloadMultiple
  };
}