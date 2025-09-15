"use client";

import { uploadObject } from "./actions";
import type { UploadProgressItem } from "@workspace/ui/components/upload-progress";
import { UploadResult, UploadOptions, UPLOAD_CONFIG } from "@/types/upload";

/**
 * Enhanced client-side upload utility with progress reporting
 */
export class UploadManager {
  private onProgress?: (progress: UploadProgressItem) => void;
  private onComplete?: (results: UploadResult[]) => void;
  private options: Required<UploadOptions>;

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
  }

  private reportProgress(fileName: string, progress: number, completed: boolean, error?: string) {
    this.onProgress?.({
      fileName,
      progress,
      completed,
      error
    });
  }

  private isLargeFile(file: File): boolean {
    return file.size > UPLOAD_CONFIG.LARGE_FILE_THRESHOLD;
  }

  async uploadFile(path: string, file: File): Promise<UploadResult> {
    try {
      // Report initial progress
      this.reportProgress(file.name, 0, false);

      // For large files, show more detailed progress simulation
      if (this.isLargeFile(file)) {
        const progressSteps = [10, 25, 40, 55, 70, 85, 95];
        for (const step of progressSteps) {
          this.reportProgress(file.name, step, false);
          await new Promise(resolve => setTimeout(resolve, 100));
        }
      } else {
        // For small files, show simple progress
        this.reportProgress(file.name, 25, false);
        await new Promise(resolve => setTimeout(resolve, 50));
      }

      // Upload the file (server handles multipart automatically based on size)
      const result = await uploadObject(path, file);

      if (result.success) {
        this.reportProgress(file.name, 100, true);
      } else {
        this.reportProgress(file.name, 0, false, result.error);
      }

      return result;
    } catch (error) {
      const errorMessage = `Failed to upload ${file.name}: ${error instanceof Error ? error.message : String(error)}`;
      this.reportProgress(file.name, 0, false, errorMessage);
      return { success: false, fileName: file.name, error: errorMessage };
    }
  }

  async uploadMultipleFiles(path: string, files: File[]): Promise<UploadResult[]> {
    const results: UploadResult[] = [];
    
    // Process files in batches to respect concurrent upload limit
    for (let i = 0; i < files.length; i += this.options.maxConcurrentUploads) {
      const batch = files.slice(i, i + this.options.maxConcurrentUploads);
      
      // Upload batch concurrently
      const batchPromises = batch.map(file => this.uploadFile(path, file));
      const batchResults = await Promise.all(batchPromises);
      
      results.push(...batchResults);
      
      // Small delay between batches
      if (i + this.options.maxConcurrentUploads < files.length) {
        await new Promise(resolve => setTimeout(resolve, 100));
      }
    }
    
    this.onComplete?.(results);
    return results;
  }
}