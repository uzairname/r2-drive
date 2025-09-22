import { Path } from '../path'

export interface ItemUploadProgress {
  fileName: string
  uploadedBytes?: number
  totalBytes?: number
  success?: boolean
  errorMsg?: string
  isMultipart?: boolean
}

export interface UIR2Item {
  path: Path
  size: number
  lastModified?: Date
  contentType?: string
  dateCreated?: Date
}
