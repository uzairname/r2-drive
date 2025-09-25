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

export const isDev = process.env.NODE_ENV === 'development'
export const USE_PRESIGNED_UPLOADS = true
