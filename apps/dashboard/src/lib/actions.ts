
"use server";

import { R2Client, FileItem } from "@/lib/r2-client";
import { revalidatePath } from "next/cache";
import { getCloudflareContext } from "@opennextjs/cloudflare";
import { UploadResult, UPLOAD_CONFIG } from "@/types/upload";

interface ListFilesResult {
  objects: FileItem[];
  folders: FileItem[];
  path: string;
  error?: string;
}

/**
 * Upload an object to R2 with automatic multipart for large files
 */
export async function uploadObject(
  path: string,
  file: File,
): Promise<UploadResult> {

  console.log("Uploading file:", file.name, "to path:", path);

  try {
    const client = new R2Client(getCloudflareContext().env);

    // Path now contains the complete upload path (including webkitRelativePath if applicable)
    const key = path;

    const arrayBuffer = await file.arrayBuffer();
    const isLargeFile = arrayBuffer.byteLength > UPLOAD_CONFIG.LARGE_FILE_THRESHOLD;
    // Report initial progress

    if (isLargeFile) {
      // Use multipart upload for large files
      await client.putObjectMultipart(key, arrayBuffer);
    } else {
      // Use regular upload for smaller files
      await client.putObject(key, arrayBuffer);
    }

    revalidatePath(path ? `/${path}` : "/");
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
 * List files and folders in a path
 */
export async function listFiles(path = ""): Promise<ListFilesResult> {
  try {
    // Normalize path: remove leading slash, add trailing slash for non-root paths
    let normalizedPath = path.startsWith("/") ? path.substring(1) : path;
    if (normalizedPath && !normalizedPath.endsWith("/")) {
      normalizedPath += "/";
    }

    // Initialize R2 client with Cloudflare context
    const client = new R2Client(getCloudflareContext().env);

    // List objects with prefix and delimiter
    const result = await client.listObjects(normalizedPath, "/");

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
 * Create a folder in R2
 */
export async function createFolder(
  path: string,
  folderName: string,
): Promise<{ success: boolean; error?: any }> {
  try {
    // Validate folder name
    if (!folderName || !folderName.trim()) {
      return { success: false, error: "Folder name cannot be empty" };
    }

    // Remove invalid characters
    const sanitizedName = folderName.trim().replace(/[<>:"/\\|?*]/g, "");
    if (sanitizedName !== folderName.trim()) {
      return { success: false, error: "Folder name contains invalid characters" };
    }

    // Construct full folder path
    // Normalize the current path (remove leading/trailing slashes)
    let normalizedPath = path.startsWith("/") ? path.substring(1) : path;
    if (normalizedPath.endsWith("/")) {
      normalizedPath = normalizedPath.slice(0, -1);
    }
    
    const folderPath = normalizedPath ? `${normalizedPath}/${sanitizedName}` : sanitizedName;

    const client = new R2Client(getCloudflareContext().env);
    await client.createFolder(folderPath);

    // Revalidate the current path to refresh the UI
    const revalidationPath = normalizedPath ? `/${normalizedPath}` : "/";
    revalidatePath(revalidationPath);
    return { success: true };
  } catch (error) {
    console.error(`Error creating folder:`, error);
    return {
      success: false,
      error: error instanceof Error ? error.message : String(error)
    };
  }
}

/**
 * Delete an object from R2
 */
export async function deleteObject(key: string): Promise<{ success: boolean; error?: string }> {
  try {
    const client = new R2Client(getCloudflareContext().env);
    await client.deleteObject(key);

    // Revalidate the path to update the UI
    const path = key.includes("/") ? `/${key.split("/").slice(0, -1).join("/")}` : "/";
    revalidatePath(path);

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
 * Delete multiple objects from R2
 */
export async function deleteObjects(keys: string[]): Promise<{ success: boolean; errors?: string[] }> {
  const errors: string[] = [];

  try {
    const client = new R2Client(getCloudflareContext().env);

    // Separate folders from files
    const folders = keys.filter(key => key.endsWith('/'));
    const files = keys.filter(key => !key.endsWith('/'));

    // Delete files directly
    if (files.length > 0) {
      try {
        await client.deleteObjects(files);
      } catch (error) {
        const errorMessage = `Failed to delete files: ${error instanceof Error ? error.message : String(error)}`;
        console.error(errorMessage);
        errors.push(errorMessage);
      }
    }

    // Delete folders by deleting all objects with that prefix
    for (const folderKey of folders) {
      try {
        const objectsInFolder = await client.listObjectKeys(folderKey);
        if (objectsInFolder.length > 0) {
          await client.deleteObjects(objectsInFolder);
        }
      } catch (error) {
        const errorMessage = `Failed to delete folder ${folderKey}: ${error instanceof Error ? error.message : String(error)}`;
        console.error(errorMessage);
        errors.push(errorMessage);
      }
    }

    // Revalidate the path to update the UI
    // Use the first key to determine the path
    if (keys.length > 0) {
      const firstKey = keys[0]!;
      const path = firstKey.includes("/") ? `/${firstKey.split("/").slice(0, -1).join("/")}` : "/";
      revalidatePath(path);
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
 * Get the R2 bucket name from Cloudflare environment
 */
export async function getBucketName(): Promise<string> {
  return getCloudflareContext().env.R2_BUCKET_NAME;
}