"use client";

import { uploadSmallObject } from "./actions";
import type { ItemUploadProgress } from "@workspace/ui/components/upload-progress";
import { UploadResult } from "@/types/upload";
import { UPLOAD_CONFIG } from "@/config/app-config";
import { uploadFileClientChunked, uploadFilesMultipart } from "./multipart-uploader";
import { Path } from "./path";

/**
 * Uploads a single file.
 * Determines upload method based on file size.
 */
export async function uploadFile(path: Path, file: File, onProgress?: (progress: ItemUploadProgress) => void): Promise<UploadResult> {

  // Determine upload method based on file size
  if (file.size > UPLOAD_CONFIG.MULTIPART_THRESHOLD_BYTES) {
    // Use multipart upload for large files
    console.log(`Using multipart upload for large file: ${file.name} (${file.size} bytes)`);
    var result = await uploadFileClientChunked(path, file, onProgress);
  } else {
    result = await uploadSmallObject(path, file);
  }
  // Upload the file with progress reporting

  if (result.success) {
    onProgress?.({
      fileName: file.name,
      percentDone: 100,
      completed: true
    });
  } else {
    const errorMessage = result.error instanceof Error ? result.error.message : String(result.error);
    onProgress?.({
      fileName: file.name,
      percentDone: 0,
      completed: false,
      error: errorMessage
    });
  }

  return result;
}


/**
 * Uploads multiple files with concurrency control and progress reporting.
 * Uses multipart upload for large files.
 */
export async function uploadFiles(path: Path, files: File[], onProgress?: (progress: ItemUploadProgress) => void): Promise<UploadResult[]> {
  const results: UploadResult[] = [];

  // Separate files by upload method
  const regularFiles = files.filter(file => file.size <= UPLOAD_CONFIG.MULTIPART_THRESHOLD_BYTES);
  const largeFiles = files.filter(file => file.size > UPLOAD_CONFIG.MULTIPART_THRESHOLD_BYTES);

  // Upload multipart files first (they take longer)
  if (largeFiles.length > 0) {
    console.log(`Uploading ${largeFiles.length} large files using multipart upload to path: ${path.key}`);
    const multipartResults = await uploadFilesMultipart(path, largeFiles, onProgress);
    results.push(...multipartResults);
  }

  // Upload regular files in batches
  if (regularFiles.length > 0) {
    console.log(`Uploading ${regularFiles.length} files using regular upload to path: ${path.key}`);

    for (let i = 0; i < regularFiles.length; i += UPLOAD_CONFIG.MAX_CONCURRENT_UPLOADS) {
      const batch = regularFiles.slice(i, i + UPLOAD_CONFIG.MAX_CONCURRENT_UPLOADS);

      // Upload batch concurrently
      const batchPromises = batch.map(file => uploadFile(path, file, onProgress));
      const batchResults = await Promise.all(batchPromises);

      results.push(...batchResults);

      // Small delay between batches
      if (i + UPLOAD_CONFIG.MAX_CONCURRENT_UPLOADS < regularFiles.length) {
        await new Promise(resolve => setTimeout(resolve, 100));
      }
    }
  }

  return results;
}
// }