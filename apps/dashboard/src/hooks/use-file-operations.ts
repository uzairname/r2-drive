import { useMemo } from "react";
import { useErrorToast, useSuccessToast, useWarningToast } from "@workspace/ui/components/toast";
import { FileOperationsService } from "../services/file-operations";

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

  return {
    handleUpload: fileOperationsService.handleUpload.bind(fileOperationsService),
    handleDelete: fileOperationsService.handleDelete.bind(fileOperationsService),
    handleDownload: fileOperationsService.handleDownload.bind(fileOperationsService),
  };
}