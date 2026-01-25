import { getMimeType } from '@r2-drive/utils/file-utils'
import { UIR2Item } from '@r2-drive/utils/types/item'
import {
  Archive,
  File,
  FileCode,
  FileJson,
  FileSpreadsheet,
  FileText,
  FileType2,
  Folder,
  Image,
  LucideIcon,
  Music,
  Video,
} from 'lucide-react'

export interface FileIconInfo {
  Icon: LucideIcon
  colorClass: string
}

export function getFileIconInfo(mimeType: string): FileIconInfo {
  if (mimeType.startsWith('image/')) return { Icon: Image, colorClass: 'text-blue-500' }
  if (mimeType.startsWith('audio/')) return { Icon: Music, colorClass: 'text-pink-500' }
  if (mimeType.startsWith('video/')) return { Icon: Video, colorClass: 'text-purple-500' }
  if (mimeType === 'application/pdf') return { Icon: FileText, colorClass: 'text-red-500' }
  if (
    mimeType === 'application/zip' ||
    mimeType === 'application/x-rar-compressed' ||
    mimeType === 'application/x-7z-compressed' ||
    mimeType === 'application/x-tar' ||
    mimeType === 'application/gzip'
  )
    return { Icon: Archive, colorClass: 'text-orange-500' }
  if (mimeType === 'application/json') return { Icon: FileJson, colorClass: 'text-green-500' }
  if (mimeType === 'text/plain' || mimeType === 'text/markdown')
    return { Icon: FileText, colorClass: 'text-muted-foreground' }
  if (
    mimeType === 'text/html' ||
    mimeType === 'text/css' ||
    mimeType === 'text/javascript' ||
    mimeType === 'text/typescript' ||
    mimeType === 'application/xml'
  )
    return { Icon: FileCode, colorClass: 'text-yellow-500' }
  if (
    mimeType === 'application/vnd.ms-excel' ||
    mimeType === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' ||
    mimeType === 'text/csv' ||
    mimeType === 'text/tab-separated-values'
  )
    return { Icon: FileSpreadsheet, colorClass: 'text-green-600' }
  if (
    mimeType === 'application/msword' ||
    mimeType === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
  )
    return { Icon: FileText, colorClass: 'text-blue-700' }
  if (
    mimeType === 'application/vnd.ms-powerpoint' ||
    mimeType === 'application/vnd.openxmlformats-officedocument.presentationml.presentation'
  )
    return { Icon: FileType2, colorClass: 'text-orange-600' }
  return { Icon: File, colorClass: 'text-muted-foreground' }
}

export function ItemIcon({ item }: { item: UIR2Item }) {
  if (item.path.isFolder) {
    return <Folder className="h-5 w-5 text-primary" />
  }

  const mimeType = item.contentType || getMimeType(item.path.name)
  const { Icon, colorClass } = getFileIconInfo(mimeType)
  return <Icon className={`h-5 w-5 ${colorClass}`} />
}
