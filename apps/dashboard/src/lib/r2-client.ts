

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

export class R2Client {
  private r2: R2Bucket;

  constructor(env: CloudflareEnv) {
    this.r2 = env.FILES;
  }

  /**
   * Internal method to list R2 objects with pagination support
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
        cursor = (listing as any).cursor;
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
  async listObjects(
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

  /**
   * Get an object from the bucket
   */
  async getObject(key: string): Promise<R2ObjectBody | null> {
    try {
      return await this.r2.get(key);
    } catch (error) {
      console.error(`Error getting object ${key}:`, error);
      throw new Error(`Failed to get object: ${error instanceof Error ? error.message : String(error)}`);
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
  async deleteObject(key: string): Promise<void> {
    try {
      await this.r2.delete(key);
    } catch (error) {
      console.error(`Error deleting object ${key}:`, error);
      throw new Error(`Failed to delete object: ${error instanceof Error ? error.message : String(error)}`);
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
   * Delete multiple objects from the bucket
   */
  async deleteObjects(keys: string[]): Promise<void> {
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
  async createFolder(key: string): Promise<R2Object | null> {
    // Ensure the key ends with a trailing slash
    const folderKey = key.endsWith("/") ? key : `${key}/`;
    
    return await this.r2.put(folderKey, "");

  }

  /**
   * Initiate a multipart upload for presigned URL approach
   */
  async initiateMultipartUpload(key: string, options?: R2PutOptions): Promise<R2MultipartUpload> {
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
