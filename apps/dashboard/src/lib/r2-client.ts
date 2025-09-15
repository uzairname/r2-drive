

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
   * List objects in the bucket with an optional prefix and delimiter
   */
  async listObjects(
    prefix = "",
    delimiter = "/"
  ): Promise<R2ListResult> {
    try {
      const options: R2ListOptions = {
        prefix,
        delimiter,
        limit: 1000, // Maximum number of objects to return in one request
      };

      const listing = await this.r2.list(options);

      console.log(`Listing: `, listing);
      
      // Convert R2Objects to FileItems
      const objects = listing.objects.map((obj) => ({
        key: obj.key,
        name: obj.key.split("/").pop() || obj.key,
        size: obj.size,
        lastModified: obj.uploaded,
        etag: obj.etag,
        isFolder: false,
      }));

      // Convert CommonPrefixes to folder FileItems
      const folders = listing.delimitedPrefixes.map((prefix) => ({
        key: prefix,
        name: prefix.split("/").slice(-2)[0] || prefix,
        size: 0,
        lastModified: new Date(0), // We don't have this info for folders
        etag: "",
        isFolder: true,
      }));

      return {
        objects,
        folders,
        truncated: listing.truncated,
        cursor: listing.truncated ? listing.cursor : undefined,
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
   * Create a folder by uploading an empty object with the folder name as the key
   * Ending with a trailing slash to indicate it's a folder
   */
  async createFolder(key: string): Promise<R2Object | null> {
    // Ensure the key ends with a trailing slash
    const folderKey = key.endsWith("/") ? key : `${key}/`;
    
    try {
      // Create an empty object with the folder key
      return await this.r2.put(folderKey, "");
    } catch (error) {
      console.error(`Error creating folder ${folderKey}:`, error);
      throw new Error(`Failed to create folder: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Initiate a multipart upload for presigned URL approach
   */
  async initiateMultipartUpload(key: string, options?: R2PutOptions): Promise<R2MultipartUpload> {
    try {
      return await this.r2.createMultipartUpload(key, options);
    } catch (error) {
      console.error(`Error initiating multipart upload for ${key}:`, error);
      throw new Error(`Failed to initiate multipart upload: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Complete a multipart upload
   */
  async completeMultipartUpload(uploadId: string, key: string, parts: R2UploadedPart[]): Promise<R2Object | null> {
    try {
      // Note: We need to get the multipart upload object first
      const multipartUpload = await this.r2.resumeMultipartUpload(key, uploadId);
      return await multipartUpload.complete(parts);
    } catch (error) {
      console.error(`Error completing multipart upload ${uploadId}:`, error);
      throw new Error(`Failed to complete multipart upload: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Abort a multipart upload
   */
  async abortMultipartUpload(uploadId: string, key: string): Promise<void> {
    try {
      const multipartUpload = await this.r2.resumeMultipartUpload(key, uploadId);
      await multipartUpload.abort();
    } catch (error) {
      console.error(`Error aborting multipart upload ${uploadId}:`, error);
      throw new Error(`Failed to abort multipart upload: ${error instanceof Error ? error.message : String(error)}`);
    }
  }
}
