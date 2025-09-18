"use client";

import { uploadObject } from "./actions";
import type { UploadProgressItem } from "@workspace/ui/components/upload-progress";
import { UploadOptions, UploadResult } from "@/types/upload";
import { UPLOAD_CONFIG } from "@/config/app-config";
import { MultipartUploader, type MultipartUploadProgress } from "./multipart-uploader";
import { Path } from "./path-system/path";

/**
 * Enhanced client-side upload utility with progress reporting and multipart support
 */
export class UploadManager {
  private onProgress?: (progress: UploadProgressItem) => void;
  private onComplete?: (results: UploadResult[]) => void;
  private options: Required<UploadOptions>;
  private multipartUploader: MultipartUploader;

  constructor(
    onProgress?: (progress: UploadProgressItem) => void,
    onComplete?: (results: UploadResult[]) => void,
    options: UploadOptions = {}
  ) {
    this.onProgress = onProgress;
    this.onComplete = onComplete;
    this.options = {
      chunkSize: UPLOAD_CONFIG.DEFAULT_CHUNK_SIZE,
      maxConcurrentUploads: UPLOAD_CONFIG.DEFAULT_MAX_CONCURRENT_UPLOADS,
      ...options
    };

    // Create multipart uploader with progress reporting
    this.multipartUploader = new MultipartUploader(
      (multipartProgress: MultipartUploadProgress) => {
        // Convert multipart progress to regular progress format
        this.reportProgress(
          multipartProgress.fileName,
          multipartProgress.progress,
          multipartProgress.completed,
          multipartProgress.error
        );
      },
      this.options.chunkSize
    );
  }

  private reportProgress(fileName: string, progress: number, completed: boolean, error?: string) {
    this.onProgress?.({
      fileName,
      progress,
      completed,
      error
    });
  }

  async uploadFile(path: Path, file: File): Promise<UploadResult> {
    // Construct the full upload path using webkitRelativePath for folder uploads
    const webkitRelativePath = file.webkitRelativePath;
    const fullPath = webkitRelativePath
      ? (path ? `${path}/${webkitRelativePath}` : webkitRelativePath)
      : (path ? `${path}/${file.name}` : file.name);

    // Determine upload method based on file size
    if (file.size > UPLOAD_CONFIG.MULTIPART_THRESHOLD) {
      // Use multipart upload for large files
      console.log(`Using multipart upload for large file: ${file.name} (${file.size} bytes)`);
      return await this.multipartUploader.uploadFile(fullPath, file);
    }

    // Use regular server-side upload for smaller files
    console.log(`Using regular upload for file: ${file.name} (${file.size} bytes)`);

    // Report initial progress
    this.reportProgress(file.name, 0, false);

    // Upload the file with progress reporting
    const result = await uploadObject(fullPath, file);

    if (result.success) {
      this.reportProgress(file.name, 100, true);
    } else {
      const errorMessage = result.error instanceof Error ? result.error.message : String(result.error);
      this.reportProgress(file.name, 0, false, errorMessage);
    }

    return result;
  }

  async uploadMultipleFiles(path: Path, files: File[]): Promise<UploadResult[]> {
    const results: UploadResult[] = [];

    // Separate files by upload method
    const regularFiles = files.filter(file => file.size <= UPLOAD_CONFIG.MULTIPART_THRESHOLD);
    const multipartFiles = files.filter(file => file.size > UPLOAD_CONFIG.MULTIPART_THRESHOLD);
    
    // Upload multipart files first (they take longer)
    if (multipartFiles.length > 0) {
      console.log(`Uploading ${multipartFiles.length} large files using multipart upload to path: ${path}`);
      const multipartResults = await this.multipartUploader.uploadMultipleFiles(path, multipartFiles);
      results.push(...multipartResults);
    }
    
    // Upload regular files in batches
    if (regularFiles.length > 0) {
      console.log(`Uploading ${regularFiles.length} files using regular upload to path: ${path}`);
      
      for (let i = 0; i < regularFiles.length; i += this.options.maxConcurrentUploads) {
        const batch = regularFiles.slice(i, i + this.options.maxConcurrentUploads);
        
        // Upload batch concurrently
        const batchPromises = batch.map(file => this.uploadFile(path, file));
        const batchResults = await Promise.all(batchPromises);
        
        results.push(...batchResults);
        
        // Small delay between batches
        if (i + this.options.maxConcurrentUploads < regularFiles.length) {
          await new Promise(resolve => setTimeout(resolve, 100));
        }
      }
    }
    
    this.onComplete?.(results);
    return results;
  }
}