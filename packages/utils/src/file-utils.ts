/**
 * Format file size to a human-readable string
 */
export function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B'

  const units = ['B', 'KB', 'MB', 'GB', 'TB', 'PB', 'EB', 'ZB', 'YB']
  const i = Math.floor(Math.log(bytes) / Math.log(1024))

  return `${(bytes / Math.pow(1024, i)).toFixed(i === 0 ? 0 : 2)} ${units[i]}`
}

/**
 * Format date to a human-readable string
 */
export function formatDate(date: Date): string {
  // Check if date is the epoch (used for folders)
  if (date.getTime() === 0) {
    return '—'
  }

  return new Intl.DateTimeFormat('en-US', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(date)
}

/**
 * Get mime type based on file extension
 */
export function getMimeType(filename: string): string {
  const extension = filename.split('.').pop()?.toLowerCase() || ''

  const mimeTypes: Record<string, string> = {
    // Images
    jpg: 'image/jpeg',
    jpeg: 'image/jpeg',
    png: 'image/png',
    gif: 'image/gif',
    svg: 'image/svg+xml',
    webp: 'image/webp',
    ico: 'image/x-icon',

    // Documents
    pdf: 'application/pdf',
    doc: 'application/msword',
    docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    xls: 'application/vnd.ms-excel',
    xlsx: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    ppt: 'application/vnd.ms-powerpoint',
    pptx: 'application/vnd.openxmlformats-officedocument.presentationml.presentation',

    // Text
    txt: 'text/plain',
    html: 'text/html',
    htm: 'text/html',
    css: 'text/css',
    js: 'text/javascript',
    ts: 'text/typescript',
    json: 'application/json',
    xml: 'application/xml',
    md: 'text/markdown',

    // Archives
    zip: 'application/zip',
    rar: 'application/x-rar-compressed',
    '7z': 'application/x-7z-compressed',
    tar: 'application/x-tar',
    gz: 'application/gzip',

    // Audio
    mp3: 'audio/mpeg',
    wav: 'audio/wav',
    ogg: 'audio/ogg',
    flac: 'audio/flac',

    // Video
    mp4: 'video/mp4',
    webm: 'video/webm',
    avi: 'video/x-msvideo',
    mov: 'video/quicktime',
    mkv: 'video/x-matroska',

    // Other
    csv: 'text/csv',
    tsv: 'text/tab-separated-values',
  }

  return mimeTypes[extension] || 'application/octet-stream'
}

/**
 * Check if a file is an image based on its mime type
 */
export function isImage(filename: string): boolean {
  const mime = getMimeType(filename)
  return mime.startsWith('image/')
}

/**
 * Check if a file is a text file based on its mime type
 */
export function isTextFile(filename: string): boolean {
  const mime = getMimeType(filename)
  return mime.startsWith('text/') || mime === 'application/json' || mime === 'application/xml'
}
