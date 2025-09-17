"use client";

import type { 
  MultipartUploadInit, 
  MultipartUploadPart, 
  MultipartUploadResult,
  PresignedUrlInfo 
} from "@/types/upload";
import { UPLOAD_CONFIG } from "@/config/app-config";
import { err, makeError, ok } from "./result";

export interface MultipartUploadProgress {
  fileName: string;
  totalSize: number;
  uploadedBytes: number;
  progress: number;
  currentPart?: number;
  totalParts?: number;
  completed: boolean;
  error?: string;
}

export class MultipartUploader {
  private onProgress?: (progress: MultipartUploadProgress) => void;
  private chunkSize: number;
  private maxConcurrentParts: number;

  constructor(
    onProgress?: (progress: MultipartUploadProgress) => void,
    chunkSize = UPLOAD_CONFIG.DEFAULT_CHUNK_SIZE,
    maxConcurrentParts = UPLOAD_CONFIG.MAX_CONCURRENT_PARTS
  ) {
    this.onProgress = onProgress;
    this.chunkSize = chunkSize;
    this.maxConcurrentParts = maxConcurrentParts;
  }

  private reportProgress(
    fileName: string,
    totalSize: number,
    uploadedBytes: number,
    currentPart?: number,
    totalParts?: number,
    completed = false,
    error?: string
  ) {
    this.onProgress?.({
      fileName,
      totalSize,
      uploadedBytes,
      progress: Math.round((uploadedBytes / totalSize) * 100),
      currentPart,
      totalParts,
      completed,
      error
    });
  }

  async uploadFile(path: string, file: File): Promise<MultipartUploadResult> {
    const fileName = file.name;
    const fileSize = file.size;
    const totalParts = Math.ceil(fileSize / this.chunkSize);

    this.reportProgress(fileName, fileSize, 0, 0, totalParts);

    console.log(`Starting multipart upload for ${fileName}, size: ${fileSize} bytes, total parts: ${totalParts}, path: ${path}`);

    try {
      // Step 1: Initiate multipart upload
      const initResponse = await fetch('/api/upload/multipart/initiate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          key: path,
          contentType: file.type || 'application/octet-stream'
        })
      });

      if (!initResponse.ok) {
        throw new Error(`Failed to initiate upload: ${initResponse.statusText}`);
      }

      const { uploadId, key }: MultipartUploadInit = await initResponse.json();

      // Step 2: Generate part numbers and get presigned URLs in batches
      const parts: MultipartUploadPart[] = [];
      let uploadedBytes = 0;

      // Process parts in batches to respect concurrent limits
      for (let i = 0; i < totalParts; i += this.maxConcurrentParts) {
        const batchEnd = Math.min(i + this.maxConcurrentParts, totalParts);
        const batchPartNumbers = Array.from({ length: batchEnd - i }, (_, idx) => i + idx + 1);

        // Get presigned URLs for this batch
        const urlsResponse = await fetch('/api/upload/multipart/presigned-urls', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            uploadId,
            key,
            partNumbers: batchPartNumbers
          })
        });

        if (!urlsResponse.ok) {
          throw new Error(`Failed to get presigned URLs: ${urlsResponse.statusText}`);
        }

        const { presignedUrls }: { presignedUrls: PresignedUrlInfo[] } = await urlsResponse.json();

        // Upload parts in this batch concurrently
        const batchPromises = presignedUrls.map(async ({ partNumber, url }) => {
          const start = (partNumber - 1) * this.chunkSize;
          const end = Math.min(start + this.chunkSize, fileSize);
          const chunk = file.slice(start, end);

          const uploadResponse = await fetch(url, {
            method: 'PUT',
            body: chunk,
            headers: {
              'Content-Type': 'application/octet-stream'
            }
          });

          if (!uploadResponse.ok) {
            throw new Error(`Failed to upload part ${partNumber}: ${uploadResponse.statusText}`);
          }

          const { etag } = await uploadResponse.json() as { etag: string };
          uploadedBytes += chunk.size;

          this.reportProgress(fileName, fileSize, uploadedBytes, partNumber, totalParts);

          return {
            partNumber,
            etag
          };
        });

        const batchResults = await Promise.all(batchPromises);
        parts.push(...batchResults);

        // Small delay between batches to prevent overwhelming the server
        if (batchEnd < totalParts) {
          await new Promise(resolve => setTimeout(resolve, 100));
        }
      }

      // Step 3: Complete multipart upload
      const completeResponse = await fetch('/api/upload/multipart/complete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          uploadId,
          key,
          parts: parts.sort((a, b) => a.partNumber - b.partNumber)
        })
      });

      if (!completeResponse.ok) {
        throw new Error(`Failed to complete upload: ${completeResponse.statusText}`);
      }

      this.reportProgress(fileName, fileSize, fileSize, totalParts, totalParts, true);

      return ok({
        fileName,
        isMultipart: true,
        uploadId,
        parts
      });

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      this.reportProgress(fileName, fileSize, 0, 0, totalParts, false, errorMessage);

      return err({
        error: makeError(error),
        fileName,
        isMultipart: true
      });
    }
  }

  /**
   * Upload multiple files using multipart upload
   */
  async uploadMultipleFiles(path: string, files: File[]): Promise<MultipartUploadResult[]> {
    const results: MultipartUploadResult[] = [];
    
    // Process files sequentially to avoid overwhelming the server
    for (const file of files) {
      // Construct the full upload path using webkitRelativePath for folder uploads
      const webkitRelativePath = file.webkitRelativePath;
      const fullPath = webkitRelativePath
        ? (path ? `${path}/${webkitRelativePath}` : webkitRelativePath)
        : (path ? `${path}/${file.name}` : file.name);
      

      const result = await this.uploadFile(fullPath, file);
      results.push(result);
      
      // Small delay between files
      await new Promise(resolve => setTimeout(resolve, 200));
    }
    
    return results;
  }
}