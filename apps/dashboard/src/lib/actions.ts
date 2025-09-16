
"use server";

import { R2Client, ListFilesResult } from "@/lib/r2-client";
import { getCloudflareContext } from "@opennextjs/cloudflare";
import { UploadResult } from "@/types/upload";
import { withAdminProtection } from "./auth-helpers";

// Functions that can be used from client components

/**
 * Upload an object to R2 with automatic multipart for large files
 */
async function _uploadObject(
  path: string,
  file: File,
): Promise<UploadResult> {
  const client = new R2Client();
  return await client.uploadObject(path, file);
}

export const uploadObject = withAdminProtection(_uploadObject);

/**
 * List files and folders in a path
 */
export async function listFiles(path = ""): Promise<ListFilesResult> {
  const client = new R2Client();
  return await client.listFiles(path);
}

/**
 * Create a folder in R2
 */
async function _createFolder(
  basePath: string,
  folderName: string,
): Promise<{ success: boolean; errorMessage?: string }> {
  const client = new R2Client();
  return await client.createFolder(basePath, folderName);
}

export const createFolder = withAdminProtection(_createFolder);

/**
 * Delete an object from R2
 */
async function _deleteObject(key: string): Promise<{ success: boolean; error?: string }> {
  const client = new R2Client();
  return await client.deleteObject(key);
}

export const deleteObject = withAdminProtection(_deleteObject);

/**
 * Delete multiple objects from R2
 */
async function _deleteObjects(keys: string[]): Promise<{ success: boolean; errors?: string[] }> {
  const client = new R2Client();
  return await client.deleteObjects(keys);
}

export const deleteObjects = withAdminProtection(_deleteObjects);

/**
 * Get the R2 bucket name from Cloudflare environment
 */
export async function getBucketName(): Promise<string> {
  return getCloudflareContext().env.R2_BUCKET_NAME;
}