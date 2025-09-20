import { Path } from '@/lib/path'

export interface ItemUploadProgress {
  fileName: string
  uploadedBytes?: number
  totalBytes?: number
  success?: boolean
  errorMsg?: string
  isMultipart?: boolean
}

export interface R2Item {
  path: Path
  size: number
  lastModified?: Date
}
