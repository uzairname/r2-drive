import { Path } from "@/lib/path-system/path";
import { deleteObjects } from "../lib/actions";
import { UploadManager } from "../lib/upload-utils";
import type { UploadProgressItem } from "@workspace/ui/components/upload-progress";

export interface FileOperationsResult {
  success: boolean;
  error?: string;
  successCount?: number;
  errorCount?: number;
  skippedFolders?: number;
}

export interface FileOperationsToasts {
  errorToast: (message: string, options?: any) => void;
  successToast: (message: string, options?: any) => void;
  warningToast: (message: string, options?: any) => void;
}

export class FileOperationsService {
  constructor(private toasts: FileOperationsToasts) {}

  async handleUpload(
    files: File[], 
    currentPath: Path, 
    onProgress?: (progress: UploadProgressItem) => void,
    onComplete?: () => void
  ): Promise<void> {
    
    // Create upload manager with progress callback
    const uploadManager = new UploadManager(
      onProgress,
      (results) => {
        // Upload completed - refresh file list
        const successCount = results.filter(r => r.success).length;
        const failCount = results.filter(r => !r.success).length;
        console.log(`Upload completed: ${successCount} successful, ${failCount} failed`);
        onComplete?.();
      }
    );

    // Start the upload
    await uploadManager.uploadMultipleFiles(currentPath, files);
  }

  async handleDelete(
    keysToDelete: string[], 
    onComplete?: () => void
  ): Promise<FileOperationsResult> {
    // Convert item IDs to full keys for deletion

    try {
      const result = await deleteObjects(keysToDelete);
      
      if (!result.success) {
        if (result.error.errors && result.error.errors.length > 0) {
          // Show specific errors
          const errorMessages = result.error.errors.map(e => 
            `${e.objectKey}: ${e.error.message}`
          ).join(', ');
          this.toasts.errorToast(`Failed to delete some items: ${errorMessages}`, {
            title: "Deletion Error"
          });
        } else {
          this.toasts.errorToast("Failed to delete selected items", {
            title: "Deletion Error",
            action: {
              label: "Retry",
              onClick: () => this.handleDelete(keysToDelete, onComplete)
            }
          });
        }
        return { success: false, error: "Deletion failed" };
      } else {
        const itemCount = keysToDelete.length;
        this.toasts.successToast(
          `Successfully deleted ${itemCount} ${itemCount === 1 ? 'item' : 'items'}`,
          { title: "Items Deleted" }
        );
        
        // Call onComplete callback
        onComplete?.();
        
        return { success: true, successCount: itemCount };
      }
    } catch (error) {
      this.toasts.errorToast("An unexpected error occurred during deletion", {
        title: "Unexpected Error",
        action: {
          label: "Retry",
          onClick: () => this.handleDelete(keysToDelete, onComplete)
        }
      });
      return { success: false, error: "Unexpected error" };
    }
  }

  async handleDownload(
    selectedItems: Path[], 
  ): Promise<FileOperationsResult> {
    let successCount = 0;
    let errorCount = 0;
    let skippedFolders = 0;
    
    for (const item of selectedItems) {
      try {
        // Build the full key for the file
        // For folders, we skip download as they're just markers
        if (item.isFolder) {
          skippedFolders++;
          continue;
        }
        
        // Use the API route for download
        const url = `/api/download?key=${encodeURIComponent(item.key)}`;
        
        // Create a download link
        const a = document.createElement('a');
        a.href = url;
        a.download = item.name;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        
        successCount++;
      } catch (error) {
        errorCount++;
        this.toasts.errorToast(`Failed to download ${item.name}`, {
          title: "Download Error"
        });
      }
    }

    // Show summary notification
    if (successCount > 0 && errorCount === 0) {
      this.toasts.successToast(
        `Started download of ${successCount} ${successCount === 1 ? 'file' : 'files'}`,
        { title: "Download Started" }
      );
    } else if (errorCount > 0) {
      this.toasts.warningToast(
        `Download started for ${successCount} files, ${errorCount} failed`,
        { title: "Partial Download" }
      );
    }
    
    if (skippedFolders > 0) {
      this.toasts.warningToast(
        `Skipped ${skippedFolders} ${skippedFolders === 1 ? 'folder' : 'folders'} (cannot download folders)`,
        { title: "Download Notice" }
      );
    }

    return {
      success: true,
      successCount,
      errorCount,
      skippedFolders
    };
  }
}