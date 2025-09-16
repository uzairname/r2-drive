
// Upload configuration constants

export const UPLOAD_CONFIG = {
  LARGE_FILE_THRESHOLD: 50 * 1024 * 1024, // 50MB
  MULTIPART_THRESHOLD: 5 * 1024 * 1024, // 5MB - use multipart upload for files larger than this to avoid Next.js body limits
  DEFAULT_CHUNK_SIZE: 5 * 1024 * 1024, // 5MB
  DEFAULT_MAX_CONCURRENT_UPLOADS: 3,
  MAX_CONCURRENT_PARTS: 3, // Maximum concurrent part uploads for multipart
} as const;
