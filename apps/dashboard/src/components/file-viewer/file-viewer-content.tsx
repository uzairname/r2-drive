'use client'

import { getPreviewType, getMimeType, PreviewType } from '@r2-drive/utils/file-utils'
import { UIR2Item } from '@r2-drive/utils/types/item'
import { AudioViewer } from './viewers/audio-viewer'
import { ImageViewer } from './viewers/image-viewer'
import { PdfViewer } from './viewers/pdf-viewer'
import { TextViewer } from './viewers/text-viewer'
import { UnsupportedViewer } from './viewers/unsupported-viewer'
import { VideoViewer } from './viewers/video-viewer'

interface FileViewerContentProps {
  item: UIR2Item
}

export function FileViewerContent({ item }: FileViewerContentProps) {
  // Use local API route to avoid CORS issues with presigned URLs
  const url = `/api/preview?key=${encodeURIComponent(item.path.key)}`

  // Get content type from item or infer from filename
  const contentType = item.contentType || getMimeType(item.path.name)
  const previewType = getPreviewType(contentType)

  return (
    <ViewerByType
      type={previewType}
      url={url}
      contentType={contentType}
      item={item}
    />
  )
}

interface ViewerByTypeProps {
  type: PreviewType
  url: string
  contentType?: string
  item: UIR2Item
}

function ViewerByType({ type, url, contentType, item }: ViewerByTypeProps) {
  switch (type) {
    case 'image':
      return <ImageViewer url={url} alt={item.path.name} />
    case 'video':
      return <VideoViewer url={url} type={contentType} />
    case 'audio':
      return <AudioViewer url={url} type={contentType} name={item.path.name} />
    case 'pdf':
      return <PdfViewer url={url} />
    case 'text':
      return <TextViewer url={url} filename={item.path.name} />
    default:
      return <UnsupportedViewer item={item} />
  }
}
