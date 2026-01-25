// Upload configuration constants
export const UPLOAD_CONFIG = {
  MULTIPART_CHUNK_SIZE: 5 * 1024 * 1024, // 20MB - use multipart upload for files larger than this to avoid Next.js body limits
  MAX_CONCURRENT_UPLOADS: 100,
  MAX_CONCURRENT_PARTS: 30, // Maximum concurrent part uploads for multipart
} as const

// R2 configuration constants
export const R2_CONFIG = {
  DEFAULT_LIST_LIMIT: 50, // Maximum number of objects to return in a single list operation
  BATCH_DELETE_SIZE: 1000, // R2 limit for bulk delete operations
} as const

// Compression configuration - show dialog when exceeding these thresholds
export const COMPRESSION_CONFIG = {
  FILE_COUNT_THRESHOLD: 20, // Show compression dialog for more than 20 files
  SIZE_THRESHOLD: 100 * 1024 * 1024, // Show compression dialog for more than 100 MB total size
} as const

export const isDev = (process.env.NODE_ENV as string) === 'development'
export const USE_PRESIGNED_UPLOADS = !isDev
