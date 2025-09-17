import { useRef, useState, useCallback } from "react";
import type { UploadProgressItem } from "@workspace/ui/components/upload-progress";

export interface UploadState {
  uploadProgress: UploadProgressItem[];
  showUploadProgress: boolean;
  isUploading: boolean;
  fileInputRef: React.RefObject<HTMLInputElement | null>;
  folderInputRef: React.RefObject<HTMLInputElement | null>;
}

export interface UploadActions {
  handleFileUpload: (e: React.ChangeEvent<HTMLInputElement>) => Promise<void>;
  handleFolderUpload: (e: React.ChangeEvent<HTMLInputElement>) => Promise<void>;
  triggerFileUpload: () => void;
  triggerFolderUpload: () => void;
  handleProgressUpdate: (progress: UploadProgressItem) => void;
  closeUploadProgress: () => void;
}

export interface UseFileUploadProps {
  currentPath: string[];
  onUpload: (files: File[], currentPath: string[], onProgress?: (progress: UploadProgressItem) => void) => Promise<void>;
}

export function useFileUpload({ currentPath, onUpload }: UseFileUploadProps): UploadState & UploadActions {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const folderInputRef = useRef<HTMLInputElement>(null);
  const [uploadProgress, setUploadProgress] = useState<UploadProgressItem[]>([]);
  const [showUploadProgress, setShowUploadProgress] = useState(false);
  const [isUploading, setIsUploading] = useState(false);

  const handleProgressUpdate = useCallback((progress: UploadProgressItem) => {
    setUploadProgress(prev => {
      const updated = [...prev];
      const index = updated.findIndex(item => item.fileName === progress.fileName);
      if (index >= 0) {
        updated[index] = progress;
      } else {
        updated.push(progress);
      }
      return updated;
    });
  }, []);

  const processFileUpload = useCallback(async (files: FileList) => {
    if (!files || files.length === 0) return;
    
    const fileArray = Array.from(files);
    setIsUploading(true);
    setShowUploadProgress(true);
    setUploadProgress(fileArray.map(file => ({
      fileName: file.name,
      progress: 0,
      completed: false
    })));
    
    try {
      await onUpload(fileArray, currentPath, handleProgressUpdate);
    } finally {
      setIsUploading(false);
    }
  }, [currentPath, onUpload, handleProgressUpdate]);

  const handleFileUpload = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files) {
      await processFileUpload(files);
    }
    // Reset the input value to allow uploading the same files again
    e.target.value = '';
  }, [processFileUpload]);

  const handleFolderUpload = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files) {
      await processFileUpload(files);
    }
    // Reset the input value to allow uploading the same folders again
    e.target.value = '';
  }, [processFileUpload]);

  const triggerFileUpload = useCallback(() => {
    fileInputRef.current?.click();
  }, []);

  const triggerFolderUpload = useCallback(() => {
    folderInputRef.current?.click();
  }, []);

  const closeUploadProgress = useCallback(() => {
    setShowUploadProgress(false);
  }, []);

  return {
    // State
    uploadProgress,
    showUploadProgress,
    isUploading,
    fileInputRef,
    folderInputRef,
    // Actions
    handleFileUpload,
    handleFolderUpload,
    triggerFileUpload,
    triggerFolderUpload,
    handleProgressUpdate,
    closeUploadProgress,
  };
}