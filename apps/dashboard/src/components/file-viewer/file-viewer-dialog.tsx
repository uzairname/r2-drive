'use client'

import { Path } from '@/lib/path'
import { Dialog, DialogOverlay, DialogPortal, DialogTitle } from '@r2-drive/ui/components/dialog'
import { UIR2Item } from '@r2-drive/utils/types/item'
import * as DialogPrimitive from '@radix-ui/react-dialog'
import { useCallback, useEffect, useRef } from 'react'
import { FileViewerContent } from './file-viewer-content'
import { FileViewerToolbar } from './file-viewer-toolbar'

interface FileViewerDialogProps {
  isOpen: boolean
  item: UIR2Item | null
  items: UIR2Item[]
  currentIndex: number
  onClose: () => void
  onNext: () => void
  onPrevious: () => void
  onDownload: (path: Path) => void
}

export function FileViewerDialog({
  isOpen,
  item,
  items,
  currentIndex,
  onClose,
  onNext,
  onPrevious,
  onDownload,
}: FileViewerDialogProps) {
  const contentRef = useRef<HTMLDivElement>(null)
  const touchStartX = useRef<number | null>(null)

  // Keyboard navigation
  useEffect(() => {
    if (!isOpen) return

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowLeft') {
        e.preventDefault()
        onPrevious()
      } else if (e.key === 'ArrowRight') {
        e.preventDefault()
        onNext()
      } else if (e.key === 'Escape') {
        e.preventDefault()
        onClose()
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [isOpen, onNext, onPrevious, onClose])

  // Touch swipe handling
  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    const touch = e.touches[0]
    if (touch) {
      touchStartX.current = touch.clientX
    }
  }, [])

  const handleTouchEnd = useCallback(
    (e: React.TouchEvent) => {
      if (touchStartX.current === null) return

      const touch = e.changedTouches[0]
      if (!touch) return

      const touchEndX = touch.clientX
      const diff = touchStartX.current - touchEndX
      const threshold = 50

      if (Math.abs(diff) > threshold) {
        if (diff > 0) {
          onNext()
        } else {
          onPrevious()
        }
      }

      touchStartX.current = null
    },
    [onNext, onPrevious]
  )

  if (!item) return null

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogPortal>
        <DialogOverlay className="bg-black/90" />
        <DialogPrimitive.Content
          ref={contentRef}
          onTouchStart={handleTouchStart}
          onTouchEnd={handleTouchEnd}
          className="fixed inset-0 z-50 flex flex-col outline-none"
          onPointerDownOutside={(e) => e.preventDefault()}
          aria-describedby={undefined}
        >
          <DialogTitle className="sr-only">File Preview: {item.path.name}</DialogTitle>
          <FileViewerToolbar
            item={item}
            currentIndex={currentIndex}
            totalItems={items.length}
            onClose={onClose}
            onPrevious={onPrevious}
            onNext={onNext}
            onDownload={() => onDownload(item.path)}
          />

          <div className="flex-1 flex items-center justify-center overflow-hidden p-4">
            <FileViewerContent item={item} />
          </div>
        </DialogPrimitive.Content>
      </DialogPortal>
    </Dialog>
  )
}
