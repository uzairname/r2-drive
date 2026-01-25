'use client'

import { Button } from '@r2-drive/ui/components/button'
import { truncateString } from '@r2-drive/ui/lib/utils'
import { UIR2Item } from '@r2-drive/utils/types/item'
import { ChevronLeft, ChevronRight, Download, X } from 'lucide-react'

interface FileViewerToolbarProps {
  item: UIR2Item
  currentIndex: number
  totalItems: number
  onClose: () => void
  onPrevious: () => void
  onNext: () => void
  onDownload: () => void
}

export function FileViewerToolbar({
  item,
  currentIndex,
  totalItems,
  onClose,
  onPrevious,
  onNext,
  onDownload,
}: FileViewerToolbarProps) {
  const hasMultipleItems = totalItems > 1

  return (
    <div className="flex items-center justify-between px-4 py-3 bg-black/50 backdrop-blur-sm border-b border-white/10">
      <div className="flex items-center gap-2 min-w-0 flex-1">
        <span className="text-white font-medium truncate" title={item.path.name}>
          {truncateString(item.path.name, 50)}
        </span>
        {hasMultipleItems && (
          <span className="text-white/60 text-sm flex-shrink-0">
            ({currentIndex + 1} / {totalItems})
          </span>
        )}
      </div>

      <div className="flex items-center gap-1">
        {hasMultipleItems && (
          <>
            <Button
              variant="ghost"
              size="sm"
              onClick={onPrevious}
              className="text-white hover:bg-white/10 h-9 w-9 p-0"
              aria-label="Previous file"
            >
              <ChevronLeft className="h-5 w-5" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={onNext}
              className="text-white hover:bg-white/10 h-9 w-9 p-0"
              aria-label="Next file"
            >
              <ChevronRight className="h-5 w-5" />
            </Button>
          </>
        )}

        <Button
          variant="ghost"
          size="sm"
          onClick={onDownload}
          className="text-white hover:bg-white/10 h-9 w-9 p-0"
          aria-label="Download file"
        >
          <Download className="h-5 w-5" />
        </Button>

        <Button
          variant="ghost"
          size="sm"
          onClick={onClose}
          className="text-white hover:bg-white/10 h-9 w-9 p-0"
          aria-label="Close viewer"
        >
          <X className="h-5 w-5" />
        </Button>
      </div>
    </div>
  )
}
