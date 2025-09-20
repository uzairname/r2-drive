import { getMimeType } from '@/lib/file-utils'
import { R2Item } from '@/types/item'
import {
  Archive,
  FileCode,
  FileJson,
  FileSpreadsheet,
  FileText,
  FileType2,
  Folder,
  Image,
  Music,
  Video,
} from 'lucide-react'

export function ItemIcon({ item }: { item: R2Item }) {
  return item.path.isFolder ? (
    <Folder className="h-5 w-5 text-primary" />
  ) : (
    (() => {
      const mimeType = getMimeType(item.path.name)
      if (mimeType.startsWith('image/')) return <Image className="h-5 w-5 text-blue-500" />
      if (mimeType.startsWith('audio/')) return <Music className="h-5 w-5 text-pink-500" />
      if (mimeType.startsWith('video/')) return <Video className="h-5 w-5 text-purple-500" />
      if (mimeType === 'application/pdf') return <FileText className="h-5 w-5 text-red-500" /> // No FilePdf, use FileText
      if (
        mimeType === 'application/zip' ||
        mimeType === 'application/x-rar-compressed' ||
        mimeType === 'application/x-7z-compressed' ||
        mimeType === 'application/x-tar' ||
        mimeType === 'application/gzip'
      )
        return <Archive className="h-5 w-5 text-orange-500" />
      if (mimeType === 'application/json') return <FileJson className="h-5 w-5 text-green-500" />
      if (mimeType === 'text/plain' || mimeType === 'text/markdown')
        return <FileText className="h-5 w-5 text-muted-foreground" />
      if (
        mimeType === 'text/html' ||
        mimeType === 'text/css' ||
        mimeType === 'text/javascript' ||
        mimeType === 'text/typescript' ||
        mimeType === 'application/xml'
      )
        return <FileCode className="h-5 w-5 text-yellow-500" />
      if (
        mimeType === 'application/vnd.ms-excel' ||
        mimeType === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' ||
        mimeType === 'text/csv' ||
        mimeType === 'text/tab-separated-values'
      )
        return <FileSpreadsheet className="h-5 w-5 text-green-600" />
      if (
        mimeType === 'application/msword' ||
        mimeType === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
      )
        return <FileText className="h-5 w-5 text-blue-700" /> // No FileWord, use FileText
      if (
        mimeType === 'application/vnd.ms-powerpoint' ||
        mimeType === 'application/vnd.openxmlformats-officedocument.presentationml.presentation'
      )
        return <FileType2 className="h-5 w-5 text-orange-600" /> // No FilePpt, use FileType2
      return <FileType2 className="h-5 w-5 text-muted-foreground" />
    })()
  )
}
