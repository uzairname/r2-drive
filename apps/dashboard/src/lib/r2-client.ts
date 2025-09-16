import { UPLOAD_CONFIG } from "@/config/app-config";
import { UploadResult } from "@/types/upload";
import { getCloudflareContext } from "@opennextjs/cloudflare";
import { revalidatePath } from "next/cache";
import type { Result } from "./result";

// Represents file/folder structure
export interface FileItem {
  key: string;
  name: string;
  size: number;
  lastModified: Date;
  etag: string;
  isFolder: boolean;
}

interface R2ListOptions {
  prefix?: string;
  delimiter?: string;
  limit?: number;
  cursor?: string;
}

interface R2ListResult {
  objects: FileItem[];
  folders: FileItem[];
  truncated: boolean;
  cursor?: string;
}

export interface ListFilesResult {
  objects: FileItem[];
  folders: FileItem[];
  path: string;
  error?: string;
}

export class R2Client {
  private r2: R2Bucket;

  constructor() {
    const { env } = getCloudflareContext();
    this.r2 = env.FILES;
  }

  /**
   * Lists all objects with the given prefix
   */
  private async listR2Objects(
    prefix = "",
    delimiter?: string,
    getAllResults = false
  ): Promise<{ objects: R2Object[]; delimitedPrefixes: string[]; truncated: boolean; cursor?: string }> {
    const allObjects: R2Object[] = [];
    const allDelimitedPrefixes: string[] = [];
    let cursor: string | undefined;
    let hasMore = true;

    while (hasMore) {
      const options: R2ListOptions = {
        prefix,
        delimiter,
        limit: 1000,
        cursor,
      };

      const listing = await this.r2.list(options);

      allObjects.push(...listing.objects);
      allDelimitedPrefixes.push(...listing.delimitedPrefixes);

      hasMore = listing.truncated && getAllResults;
      if (hasMore && 'cursor' in listing) {
        cursor = listing.cursor;
      } else {
        cursor = undefined;
      }

      // If we only want one page, break after first iteration
      if (!getAllResults) break;
    }

    return {
      objects: allObjects,
      delimitedPrefixes: allDelimitedPrefixes,
      truncated: hasMore,
      cursor
    };
  }

  /**
   * List objects in the bucket with an optional prefix and delimiter
   */
  private async listObjects(
    prefix = "",
    delimiter = "/"
  ): Promise<R2ListResult> {
    try {
      const result = await this.listR2Objects(prefix, delimiter, false);

      console.log(`Listing with prefix "${prefix}":`, {
        objects: result.objects.map(o => ({ key: o.key, size: o.size })),
        delimitedPrefixes: result.delimitedPrefixes
      });

      const regularObjects = result.objects.filter((obj) => !(obj.key.endsWith("/") && obj.size === 0));

      const objects = regularObjects.map((obj) => ({
        key: obj.key,
        name: obj.key.split("/").pop() || obj.key,
        size: obj.size,
        lastModified: obj.uploaded,
        etag: obj.etag,
        isFolder: false,
      }));

      // Convert CommonPrefixes to folder FileItems
      const folders = result.delimitedPrefixes.map((prefix) => ({
        key: prefix,
        name: prefix.endsWith("/")
          ? prefix.slice(0, -1).split("/").pop() || prefix
          : prefix.split("/").pop() || prefix,
        size: 0,
        lastModified: new Date(0),
        etag: "",
        isFolder: true,
      }));

      return {
        objects,
        folders,
        truncated: result.truncated,
        cursor: result.cursor,
      };
    } catch (error) {
      console.error("Error listing objects:", error);
      throw new Error(`Failed to list objects: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  async listFiles(path = ""): Promise<ListFilesResult> {
    try {

      let normalizedPath = path.startsWith("/") ? path.substring(1) : path;
      if (normalizedPath && !normalizedPath.endsWith("/")) {
        normalizedPath += "/";
      }
      const result = await this.listObjects(normalizedPath, "/");
      return {
        objects: result.objects,
        folders: result.folders,
        path: normalizedPath,
      };
    } catch (error) {

      console.error("Error listing files:", error);
      return {
        objects: [],
        folders: [],
        path,
        error: `Failed to list files: ${error instanceof Error ? error.message : String(error)}`,
      };
    }
  }

  /**
   * Get an object from the bucket with the specified key
   */
  async getObject(key: string): Promise<R2ObjectBody | null> {
    try {
      return await this.r2.get(key);
    } catch (error) {
      console.error(`Error getting object ${key}:`, error);
      throw new Error(`Failed to get object: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  async uploadObject(
    path: string,
    file: File,
  ): Promise<UploadResult> {

    try {

      const key = path;

      const arrayBuffer = await file.arrayBuffer();
      const isLargeFile = arrayBuffer.byteLength > UPLOAD_CONFIG.LARGE_FILE_THRESHOLD;
      // Report initial progress

      if (isLargeFile) {
        // Use multipart upload for large files
        await this.putObjectMultipart(key, arrayBuffer);
      } else {
        // Use regular upload for smaller files
        await this.putObject(key, arrayBuffer);
      }

      return {
        success: true,
        fileName: file.name
      };
    } catch (error) {
      console.error(`Error uploading file ${file.name}:`, error);
      return {
        success: false,
        fileName: file.name,
        error
      };

    }
  }



  /**
   * Upload an object to the bucket (optimized for size)
   */
  async putObject(
    key: string,
    data: ReadableStream | ArrayBuffer | string,
    onProgress?: (progress: { uploaded: number; total: number }) => void
  ): Promise<R2Object | null> {
    try {
      // For ArrayBuffer, check size and use multipart if needed
      if (data instanceof ArrayBuffer && data.byteLength > 50 * 1024 * 1024) { // 50MB threshold
        return await this.putObjectMultipart(key, data);
      }

      // For smaller files, simulate progress since R2 doesn't provide upload progress
      if (onProgress && data instanceof ArrayBuffer) {
        const totalSize = data.byteLength;
        onProgress({ uploaded: 0, total: totalSize });

        const result = await this.r2.put(key, data);

        onProgress({ uploaded: totalSize, total: totalSize });
        return result;
      }

      return await this.r2.put(key, data);
    } catch (error) {
      console.error(`Error uploading object ${key}:`, error);
      throw new Error(`Failed to upload object: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Upload large objects using multipart upload
   */
  async putObjectMultipart(
    key: string,
    data: ArrayBuffer,
  ): Promise<R2Object | null> {
    try {
      const chunkSize = 5 * 1024 * 1024; // 5MB chunks (minimum for multipart)
      const totalSize = data.byteLength;
      const totalParts = Math.ceil(totalSize / chunkSize);

      // Create multipart upload
      const multipartUpload = await this.r2.createMultipartUpload(key);
      const uploadId = multipartUpload.uploadId;

      const parts: R2UploadedPart[] = [];
      let uploadedBytes = 0;

      try {
        // Upload each part
        for (let partNumber = 1; partNumber <= totalParts; partNumber++) {
          const start = (partNumber - 1) * chunkSize;
          const end = Math.min(start + chunkSize, totalSize);
          const chunk = data.slice(start, end);

          const part = await multipartUpload.uploadPart(partNumber, chunk);
          parts.push({
            partNumber,
            etag: part.etag
          });

          uploadedBytes += chunk.byteLength;
        }

        // Complete the multipart upload
        return await multipartUpload.complete(parts);
      } catch (error) {
        // Abort the multipart upload on error
        await multipartUpload.abort();
        throw error;
      }
    } catch (error) {
      console.error(`Error uploading multipart object ${key}:`, error);
      throw new Error(`Failed to upload multipart object: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Delete an object from the bucket
   */
  async deleteObject(key: string): Promise<{ success: boolean; error?: string }> {
  try {
    await this.r2.delete(key);
    return { success: true };
  } catch (error) {
    console.error(`Error deleting object ${key}:`, error);
    return {
      success: false,
      error: `Failed to delete object: ${error instanceof Error ? error.message : String(error)}`
    };
  }
}

  /**
   * List the keys of all objects with a given prefix
   */
  async listObjectKeys(prefix: string): Promise<string[]> {
    const result = await this.listR2Objects(prefix, undefined, true);
    return result.objects.map(obj => obj.key);
  }

  /**
   * Delete multiple files or folders from the bucket
   */
  async deleteObjects(keys: string[]): Promise<{ success: boolean; errors?: string[] }> {
    const errors: string[] = [];

    try {

      // Separate folders from files
      const folders = keys.filter(key => key.endsWith('/'));
      const files = keys.filter(key => !key.endsWith('/'));

      // Delete files directly
      if (files.length > 0) {
        try {
          await this._deleteObjects(files);
        } catch (error) {
          const errorMessage = `Failed to delete files: ${error instanceof Error ? error.message : String(error)}`;
          console.error(errorMessage);
          errors.push(errorMessage);
        }
      }

      // Delete folders by deleting all objects with that prefix
      for (const folderKey of folders) {
        try {
          const objectsInFolder = await this.listObjectKeys(folderKey);
          if (objectsInFolder.length > 0) {
            await this._deleteObjects(objectsInFolder);
          }
        } catch (error) {
          const errorMessage = `Failed to delete folder ${folderKey}: ${error instanceof Error ? error.message : String(error)}`;
          console.error(errorMessage);
          errors.push(errorMessage);
        }
      }

      return {
        success: errors.length === 0,
        errors: errors.length > 0 ? errors : undefined
      };
    } catch (error) {
      console.error(`Error deleting objects:`, error);
      return {
        success: false,
        errors: [`Failed to delete objects: ${error instanceof Error ? error.message : String(error)}`]
      };
    }
  }


  /**
   * Delete multiple objects from the bucket
   */
  private async _deleteObjects(keys: string[]): Promise<void> {
    // R2 delete method can handle arrays for bulk deletion
    if (keys.length === 0) return;

    // Delete in batches if we have too many keys
    const batchSize = 1000; // R2 limit for bulk operations
    for (let i = 0; i < keys.length; i += batchSize) {
      const batch = keys.slice(i, i + batchSize);
      await this.r2.delete(batch);
    }
  }

  /**
   * Create a folder by uploading an empty object with the folder name as the key
   * Ending with a trailing slash to indicate it's a folder
   */
  async createFolder(
    basePath: string,
    folderName: string): Promise<{ success: boolean; errorMessage?: string }> {

    try {
      // Validate folder name
      if (!folderName || !folderName.trim()) {
        return { success: false, errorMessage: "Folder name cannot be empty" };
      }

      // Remove invalid characters
      const sanitizedName = folderName.trim().replace(/[<>:"/\\|?*]/g, "");
      if (sanitizedName !== folderName.trim()) {
        return { success: false, errorMessage: "Folder name contains invalid characters" };
      }

      // Construct full folder path
      // Normalize the current path (remove leading/trailing slashes)
      let normalizedPath = basePath.startsWith("/") ? basePath.substring(1) : basePath;
      if (normalizedPath.endsWith("/")) {
        normalizedPath = normalizedPath.slice(0, -1);
      }

      const folderPath = normalizedPath ? `${normalizedPath}/${sanitizedName}` : sanitizedName;

      // Ensure the key ends with a trailing slash
      const folderKey = folderPath.endsWith("/") ? folderPath : `${folderPath}/`;
      await this.r2.put(folderKey, "");

      // Revalidate the current path to refresh the UI
      const revalidationPath = normalizedPath ? `/${normalizedPath}` : "/";
      revalidatePath(revalidationPath);
      return { success: true };
    } catch (error) {
      console.error(`Error creating folder:`, error);
      return {
        success: false,
        errorMessage: error instanceof Error ? error.message : String(error)
      };
    }
  }

  /**
   * Initiate a multipart upload for presigned URL approach
   */
  async createMultipartUpload(key: string, options?: R2PutOptions): Promise<R2MultipartUpload> {
    return await this.r2.createMultipartUpload(key, options);
  }

  /**
   * Complete a multipart upload
   */
  async completeMultipartUpload(uploadId: string, key: string, parts: R2UploadedPart[]): Promise<R2Object | null> {
    // Note: We need to get the multipart upload object first
    const multipartUpload = this.r2.resumeMultipartUpload(key, uploadId);
    return await multipartUpload.complete(parts);
  }

  /**
   * Abort a multipart upload
   */
  async abortMultipartUpload(uploadId: string, key: string): Promise<void> {
    const multipartUpload = this.r2.resumeMultipartUpload(key, uploadId);
    await multipartUpload.abort();
  }
}