// Upload configuration constants
export const UPLOAD_CONFIG = {
  MULTIPART_THRESHOLD_BYTES: 5 * 1024 * 1024, // 5MB - use multipart upload for files larger than this to avoid Next.js body limits
  DEFAULT_CHUNK_SIZE: 5 * 1024 * 1024, // 5MB
  MAX_CONCURRENT_UPLOADS: 30,
  MAX_CONCURRENT_PARTS: 3, // Maximum concurrent part uploads for multipart
} as const

// R2 configuration constants
export const R2_CONFIG = {
  LIST_LIMIT: 50, // Maximum number of objects to return in a single list operation
  BATCH_DELETE_SIZE: 1000, // R2 limit for bulk delete operations
} as const
