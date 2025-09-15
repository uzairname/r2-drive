export interface UploadResult {
  success: boolean;
  fileName: string;
  error?: string;
  isMultipart?: boolean;
}

export interface UploadOptions {
  chunkSize?: number; // For client-side chunking (default: 5MB)
  maxConcurrentUploads?: number; // Max concurrent file uploads (default: 3)
}

// Upload configuration constants
export const UPLOAD_CONFIG = {
  LARGE_FILE_THRESHOLD: 50 * 1024 * 1024, // 50MB
  DEFAULT_CHUNK_SIZE: 5 * 1024 * 1024, // 5MB
  DEFAULT_MAX_CONCURRENT_UPLOADS: 3,
} as const;