import { useMemo } from "react";
import { useErrorToast, useSuccessToast, useWarningToast } from "@workspace/ui/components/toast";
import { FileOperationsService } from "../services/file-operations";
import type { UploadProgressItem } from "@workspace/ui/components/upload-progress";

export function useFileOperations() {
  const errorToast = useErrorToast();
  const successToast = useSuccessToast();
  const warningToast = useWarningToast();

  const fileOperationsService = useMemo(() => {
    return new FileOperationsService({
      errorToast,
      successToast,
      warningToast,
    });
  }, [errorToast, successToast, warningToast]);

  const handleUpload = async (
    files: File[], 
    currentPath: string[], 
    onProgress?: (progress: UploadProgressItem) => void,
    onComplete?: () => void
  ) => {
    return fileOperationsService.handleUpload(files, currentPath, onProgress, onComplete);
  };

  const handleDelete = async (
    selectedItemIds: string[], 
    currentPath: string[], 
    onComplete?: () => void
  ) => {
    return fileOperationsService.handleDelete(selectedItemIds, currentPath, onComplete);
  };

  const handleDownload = async (
    selectedItemIds: string[], 
    currentPath: string[]
  ) => {
    return fileOperationsService.handleDownload(selectedItemIds, currentPath);
  };

  return {
    handleUpload,
    handleDelete,
    handleDownload,
  };
}