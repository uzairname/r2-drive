"use client"

import { ItemUploadProgress } from "@/types/upload";
import { Path, Paths } from "./path";
import { UPLOAD_CONFIG } from "@/config/app-config";
import pLimit from "p-limit";
import { err, ok, Result } from "./result";

export async function uploadFiles(
  folder: Path,
  files: File[],
  onProgress?: (progress: ItemUploadProgress) => void
): Promise<Result<void, string>> {

  // Throw error if duplicate file keys are found
  const fileKeys = files.map((f) => Paths.filePath(folder, f).key);
  const duplicatesExist = new Set(fileKeys).size !== fileKeys.length;
  if (duplicatesExist) {
    return err("Attempted to upload files with duplicate keys to the same folder");
  }

  const chunkSize = UPLOAD_CONFIG.MULTIPART_CHUNK_SIZE;
  const maxConcurrentUploads = UPLOAD_CONFIG.MAX_CONCURRENT_UPLOADS;

  // Report initial progress for all files
  files.forEach(file => {
    onProgress?.({
      fileName: file.name,
      uploadedBytes: 0,
      totalBytes: file.size,
      isMultipart: file.size > chunkSize,
    });
  });

  // 1. Get presigned URLs


  // Files that will be uploaded in a single part
  const smallFiles = files.filter(file => file.size <= chunkSize);
  // Files that will be uploaded in multiple parts
  const largeFiles = files.filter(file => file.size > chunkSize);

  const prepareOptions = {
    smallFiles: smallFiles.map(file => ({
      key: Paths.filePath(folder, file).key,
    })),
    largeFiles: largeFiles.map(file => ({
      key: Paths.filePath(folder, file).key,
      partCount: Math.ceil(file.size / chunkSize),
    })),
  }

  const response = await fetch('/api/upload/prepare', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(prepareOptions),
  });

  if (!response.ok) {
    return err(`Failed to prepare upload: ${response.statusText}`)
  }

  const { singleUploads, multiPartUploads } = await response.json() as {
    singleUploads: { key: string; url: string }[];
    multiPartUploads: { key: string; uploadId: string; partUrls: string[] }[];
  };

  // 2. Upload files

  const limit = pLimit(maxConcurrentUploads);

  const singlepartPromises = smallFiles.map(file => {
    const uploadInfo = singleUploads.find(u => u.key === Paths.filePath(folder, file).key);
    if (!uploadInfo?.url) return Promise.resolve()

    console.log('Uploading small file to URL:', uploadInfo.url);

    return limit(() => fetch(uploadInfo.url, {
      method: 'PUT',
      body: file,
    }).then(res => {
      onProgress?.({
        fileName: file.name,
        uploadedBytes: file.size,
        totalBytes: file.size,
        success: res.ok,
        isMultipart: false,
        errorMsg: res.ok ? undefined : `Upload failed with status ${res.status}`,
      })
    }));
  });

  await Promise.all(singlepartPromises);

  const largeFilesProgress = largeFiles.map(file => ({
    fileName: file.name,
    totalBytes: file.size,
    uploadedBytes: 0,
  }));

  const multipartPromises = largeFiles.map(file => {
    const fileUploadInfo = multiPartUploads.find(u => u.key === Paths.filePath(folder, file).key);
    if (!fileUploadInfo) throw new Error(`Missing upload info for file ${file.name}`);

    const partPromises = fileUploadInfo.partUrls.map((url, index) => {
      return limit(async () => {
        const chunk = file.slice(index * chunkSize, Math.min((index + 1) * chunkSize, file.size));
        const response = await fetch(url, {
          method: 'PUT',
          body: chunk,
        });
        const etag = response.headers.get('ETag')?.replace(/"/g, '');
        if (!etag) throw new Error(`Missing ETag in response for part ${index + 1} of file ${file.name}`);

        // Bytes uploaded in this chunk
        const currentChunkSize = chunk.size;

        // Update progress
        const progressInfo = largeFilesProgress.find(p => p.fileName === file.name);
        if (progressInfo) {
          progressInfo.uploadedBytes += currentChunkSize;
          onProgress?.({
            fileName: file.name,
            totalBytes: progressInfo.totalBytes,
            uploadedBytes: progressInfo.uploadedBytes,
            isMultipart: true,
          });
        }

        return { key: fileUploadInfo.key, partNumber: index + 1, uploadId: fileUploadInfo.uploadId, etag, fileSize: file.size };
      });

    });

    return partPromises
  }).flat()


  const multipartCompletions = await Promise.all(multipartPromises);

  if (multipartPromises.length > 0) {

    // Group parts by uploadId
    const completionMap: Record<string, { key: string; uploadId: string; parts: { partNumber: number; etag: string }[], fileSize: number }> = {};
    for (const part of multipartCompletions) {
      if (!completionMap[part.uploadId]) {
        completionMap[part.uploadId] = { key: part.key, uploadId: part.uploadId, parts: [], fileSize: part.fileSize };
      }
      completionMap[part.uploadId]!.parts.push({ partNumber: part.partNumber, etag: part.etag });
    }

    // Complete multipart uploads
    const completionPromises = Object.values(completionMap).map(({ key, uploadId, parts, fileSize }) => {
      return limit(async () => {
        const response = await fetch('/api/upload/complete', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ key, uploadId, parts }),
        });
        onProgress?.({
          fileName: Paths.fromR2Key(key).name,
          uploadedBytes: fileSize, // Approximate
          totalBytes: fileSize,
          success: response.ok,
          isMultipart: true,
          errorMsg: response.ok ? undefined : `Completion failed with status ${response.status}`,
        });
      });
    });

    await Promise.all(completionPromises);
  }

  return ok(undefined)


}