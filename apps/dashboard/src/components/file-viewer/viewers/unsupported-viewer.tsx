'use client'

import { getFileIconInfo } from '@/components/bucket-navigator/item-icon'
import { Button } from '@r2-drive/ui/components/button'
import { formatBytes, getMimeType } from '@r2-drive/utils/file-utils'
import { UIR2Item } from '@r2-drive/utils/types/item'
import { Download } from 'lucide-react'

interface UnsupportedViewerProps {
  item: UIR2Item
}

export function UnsupportedViewer({ item }: UnsupportedViewerProps) {
  const mimeType = item.contentType || getMimeType(item.path.name)
  const { Icon } = getFileIconInfo(mimeType)

  const handleDownload = () => {
    // Use download endpoint instead of preview for proper attachment headers
    const downloadUrl = `/api/download?key=${encodeURIComponent(item.path.key)}`
    const link = document.createElement('a')
    link.href = downloadUrl
    link.download = item.path.name
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  return (
    <div className="flex flex-col items-center gap-6 p-8 bg-white/5 rounded-xl max-w-md text-center">
      <div className="p-6 bg-white/10 rounded-full">
        <Icon className="h-16 w-16 text-white/80" />
      </div>
      <div>
        <h3 className="text-white font-medium text-lg mb-2 break-all">{item.path.name}</h3>
        <p className="text-white/60 text-sm mb-1">Preview not available</p>
        {item.size > 0 && (
          <p className="text-white/40 text-sm">{formatBytes(item.size)}</p>
        )}
      </div>
      <Button onClick={handleDownload} className="gap-2">
        <Download className="h-4 w-4" />
        Download File
      </Button>
    </div>
  )
}
