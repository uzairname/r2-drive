
"use server";

import { R2Client, ListFilesResult, DeleteObjectsErrors } from "@/lib/r2-client";
import { getCloudflareContext } from "@opennextjs/cloudflare";
import { UploadResult } from "@/types/upload";
import { withAdminProtection } from "./auth-helpers";
import { Result, ok, err, safeAsync } from "./result";
import { Path, Paths } from "./path";

// Functions that can be used from client components

/**
 * Upload an object to R2 using the server
 */
async function _uploadSmallObject(
  folder: Path,
  file: File,
  onProgress?: (progress: { uploaded: number; total: number }) => void,
): Promise<UploadResult> {
  const client = new R2Client();
  return await client.uploadSmallObject(folder, file, onProgress);
}

export const uploadSmallObject = withAdminProtection(_uploadSmallObject);

/**
 * List files and folders in a folder
 */
export async function listFiles(path: Path): Promise<Result<ListFilesResult>> {
  const client = new R2Client();
  return await client.listFiles(path);
}

/**
 * Create a folder in R2
 */
async function _createFolder(
  baseFolder: Path,
  name: string,
): Promise<Result<void, string>> {
    const client = new R2Client(); 
    return await client.createFolder(baseFolder, name);
}

export const createFolder = withAdminProtection(_createFolder);

/**
 * Delete multiple objects from R2
 */
async function _deleteObjects(keys: string[]): Promise<Result<void, {errors?: DeleteObjectsErrors, error?: Error }>> {
  const client = new R2Client();
  const result = await client.deleteObjects(keys.map(k => Paths.fromR2Key(k)));
  
  if (!result.success) {
    return err({errors: result.error});
  }
  
  return ok(undefined);
}

export const deleteObjects = withAdminProtection(_deleteObjects);

/**
 * Get the R2 bucket name from Cloudflare environment
 */
export async function getBucketName(): Promise<string> {
  // throw 0
  console.log("Fetching R2 bucket name from environment");
  return getCloudflareContext().env.R2_BUCKET_NAME;
}
