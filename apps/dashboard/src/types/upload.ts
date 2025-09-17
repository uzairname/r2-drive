import { Result } from "@/lib/result";

export interface UploadData {
  fileName: string;
  isMultipart?: boolean;
}

export type UploadResult = Result<UploadData, UploadData & { error: Error }>

export interface UploadOptions {
  chunkSize?: number; // For client-side chunking (default: 5MB)
  maxConcurrentUploads?: number; // Max concurrent file uploads (default: 3)
}

// Multipart upload types
export interface MultipartUploadInit {
  uploadId: string;
  key: string;
}

export interface MultipartUploadPart {
  partNumber: number;
  etag: string;
}

export interface PresignedUrlInfo {
  partNumber: number;
  url: string;
}

export interface MultipartUploadData extends UploadData {
  uploadId?: string;
  parts?: MultipartUploadPart[];
}

export type MultipartUploadResult = Result<MultipartUploadData, MultipartUploadData & { error: Error }>;