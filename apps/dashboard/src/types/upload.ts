export interface UploadResult {
  success: boolean;
  error?: unknown;
  fileName: string;
  isMultipart?: boolean;
}

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

export interface MultipartUploadResult extends UploadResult {
  uploadId?: string;
  parts?: MultipartUploadPart[];
}

