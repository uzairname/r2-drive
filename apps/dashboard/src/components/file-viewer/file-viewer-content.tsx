'use client'

import { getPreviewType, getMimeType, PreviewType } from '@r2-drive/utils/file-utils'
import { UIR2Item } from '@r2-drive/utils/types/item'
import { AudioViewer } from './viewers/audio-viewer'
import { ImageViewer } from './viewers/image-viewer'
import { PdfViewer } from './viewers/pdf-viewer'
import { SpreadsheetViewer } from './viewers/spreadsheet-viewer'
import { TextViewer } from './viewers/text-viewer'
import { UnsupportedViewer } from './viewers/unsupported-viewer'
import { VideoViewer } from './viewers/video-viewer'

interface FileViewerContentProps {
  item: UIR2Item
  onControlsHiddenChange?: (hidden: boolean) => void
}

export function FileViewerContent({ item, onControlsHiddenChange }: FileViewerContentProps) {
  // Use local API route to avoid CORS issues with presigned URLs
  const url = `/api/preview?key=${encodeURIComponent(item.path.key)}`

  // Get content type from item, but fall back to filename detection if it's a generic binary type
  const inferredType = getMimeType(item.path.name)
  const contentType =
    item.contentType && item.contentType !== 'application/octet-stream'
      ? item.contentType
      : inferredType
  const previewType = getPreviewType(contentType)

  return (
    <ViewerByType
      type={previewType}
      url={url}
      contentType={contentType}
      item={item}
      onControlsHiddenChange={onControlsHiddenChange}
    />
  )
}

interface ViewerByTypeProps {
  type: PreviewType
  url: string
  contentType?: string
  item: UIR2Item
  onControlsHiddenChange?: (hidden: boolean) => void
}

function ViewerByType({ type, url, contentType, item, onControlsHiddenChange }: ViewerByTypeProps) {
  switch (type) {
    case 'image':
      return <ImageViewer url={url} alt={item.path.name} />
    case 'video':
      return <VideoViewer url={url} type={contentType} />
    case 'audio':
      return <AudioViewer url={url} type={contentType} name={item.path.name} />
    case 'pdf':
      return <PdfViewer url={url} onControlsHiddenChange={onControlsHiddenChange} />
    case 'text':
      return <TextViewer url={url} filename={item.path.name} />
    case 'spreadsheet':
      return <SpreadsheetViewer url={url} item={item} />
    default:
      return <UnsupportedViewer item={item} />
  }
}
