import { Path } from '../path'

export interface ItemUploadProgress {
  fileName: string
  uploadedBytes?: number
  totalBytes?: number
  success?: boolean
  errorMsg?: string
  isMultipart?: boolean
}

export interface ItemDownloadProgress {
  key: string
  fileName: string
  downloadedBytes: number
  totalBytes: number
  status: 'pending' | 'downloading' | 'completed' | 'error'
  errorMsg?: string
}

export interface UIR2Item {
  path: Path
  size: number
  lastModified?: Date
  contentType?: string
  dateCreated?: Date
}
