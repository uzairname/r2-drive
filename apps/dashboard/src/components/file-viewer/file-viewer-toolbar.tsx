'use client'

import { useIsMobile } from '@/hooks/use-mobile'
import { Button } from '@r2-drive/ui/components/button'
import { UIR2Item } from '@r2-drive/utils/types/item'
import { Check, ChevronLeft, ChevronRight, Download, Link, X } from 'lucide-react'
import { useState } from 'react'
import { FileInfoDialog } from '../bucket-navigator/file-info-dialog'
import { TruncatedText } from '../bucket-navigator/truncated-text'

interface FileViewerToolbarProps {
  item: UIR2Item
  currentIndex: number
  totalItems: number
  onClose: () => void
  onPrevious: () => void
  onNext: () => void
  onDownload: () => void
  hidden?: boolean
}

export function FileViewerToolbar({
  item,
  currentIndex,
  totalItems,
  onClose,
  onPrevious,
  onNext,
  onDownload,
  hidden = false,
}: FileViewerToolbarProps) {
  const hasMultipleItems = totalItems > 1
  const [copied, setCopied] = useState(false)
  const [showInfoDialog, setShowInfoDialog] = useState(false)
  const isMobile = useIsMobile()

  const handleCopyLink = async () => {
    // Build the file explorer URL with path (parent folder) and preview (file key) params
    const params = new URLSearchParams()
    const parentParts = item.path.parts.slice(0, -1)
    if (parentParts.length > 0) {
      params.set('path', parentParts.join('/'))
    }
    params.set('preview', item.path.key)
    const queryString = params.toString()
    const explorerUrl = `${window.location.origin}/explorer${queryString ? `?${queryString}` : ''}`
    await navigator.clipboard.writeText(explorerUrl)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div
      className={`flex items-center justify-between px-4 py-3 bg-black border-b border-white/10 transition-transform duration-200 ${
        hidden ? '-translate-y-full' : 'translate-y-0'
      }`}
    >
      <div className="flex items-center gap-3 min-w-0 flex-1">
        {isMobile ? (
          <button
            onClick={() => setShowInfoDialog(true)}
            className="min-w-0 text-left"
          >
            <TruncatedText className="text-white font-medium">
              {item.path.name}
            </TruncatedText>
          </button>
        ) : (
          <TruncatedText className="text-white font-medium">
            {item.path.name}
          </TruncatedText>
        )}
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
          onClick={handleCopyLink}
          className="text-white hover:bg-white/10 h-9 w-9 p-0"
          aria-label="Copy link"
        >
          {copied ? <Check className="h-5 w-5 text-green-400" /> : <Link className="h-5 w-5" />}
        </Button>

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

      <FileInfoDialog
        show={showInfoDialog}
        onOpenChange={setShowInfoDialog}
        item={item}
      />
    </div>
  )
}
