
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
export async function uploadObject(path: string, file: File): Promise<UploadResult> {
  try {
    const client = new R2Client(getCloudflareContext().env);
    
    // Use webkitRelativePath for folder uploads if available, otherwise use file.name
    const relativePath = (file as any).webkitRelativePath || file.name;
    const key = path ? `${path}/${relativePath}` : relativePath;
    
    const arrayBuffer = await file.arrayBuffer();
    const isLargeFile = arrayBuffer.byteLength > UPLOAD_CONFIG.LARGE_FILE_THRESHOLD;
    
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
      fileName: file.name,
      isMultipart: isLargeFile
    };
  } catch (error) {
    const errorMessage = `Failed to upload ${file.name}: ${error instanceof Error ? error.message : String(error)}`;
    console.error(`Error uploading object:`, error);
    return { success: false, fileName: file.name, error: errorMessage };
  }
}

/**
 * List files and folders in a path
 */
export async function listFiles(path = ""): Promise<ListFilesResult> {
  try {
    // Remove leading slash and ensure trailing slash for folder prefix
    const normalizedPath = path.startsWith("/") ? path.substring(1) : path;
    
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
 * Get object from R2 and return its data
 */
export async function getObject(key: string): Promise<Response> {
  try {
    const client = new R2Client(getCloudflareContext().env);
    const object = await client.getObject(key);
    
    if (!object) {
      return new Response("Not found", { status: 404 });
    }
    
    // Set content type based on object metadata
    const headers = new Headers();
    headers.set("Content-Type", object.httpMetadata?.contentType || "application/octet-stream");
    headers.set("Content-Length", object.size.toString());
    
    // Set filename for download
    const filename = key.split("/").pop() || key;
    headers.set("Content-Disposition", `inline; filename="${filename}"`);

    return new Response(object.body, {
      headers
    });
  } catch (error) {
    console.error(`Error getting object ${key}:`, error);
    return new Response(`Failed to get object: ${error instanceof Error ? error.message : String(error)}`, { 
      status: 500 
    });
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
    
    // Delete objects in parallel
    const deletePromises = keys.map(async (key) => {
      try {
        await client.deleteObject(key);
      } catch (error) {
        const errorMessage = `Failed to delete ${key}: ${error instanceof Error ? error.message : String(error)}`;
        console.error(errorMessage);
        errors.push(errorMessage);
      }
    });
    
    await Promise.all(deletePromises);
    
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