import { Result } from '@/lib/result'

export interface UploadData {
  fileName: string
}

export interface ItemUploadProgress {
  fileName: string
  uploadedBytes?: number
  totalBytes?: number
  success?: boolean
  errorMsg?: string
  isMultipart?: boolean
}

export type UploadResult = Result<UploadData, UploadData & { error: Error }>

export interface UploadOptions {}

// Multipart upload types
export interface MultipartUploadInit {
  uploadId: string
  key: string
}

export interface MultipartUploadPart {
  partNumber: number
  etag: string
}

export interface PresignedUrlInfo {
  partNumber: number
  url: string
}

export interface MultipartUploadData extends UploadData {
  // uploadId?: string;
  parts?: MultipartUploadPart[]
}

export type MultipartUploadResult = Result<
  MultipartUploadData,
  MultipartUploadData & { error: Error }
>
