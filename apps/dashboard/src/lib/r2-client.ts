

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
   * Upload an object to the bucket
   */
  async putObject(key: string, data: ReadableStream | ArrayBuffer | string): Promise<R2Object | null> {
    try {
      return await this.r2.put(key, data);
    } catch (error) {
      console.error(`Error uploading object ${key}:`, error);
      throw new Error(`Failed to upload object: ${error instanceof Error ? error.message : String(error)}`);
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
}
