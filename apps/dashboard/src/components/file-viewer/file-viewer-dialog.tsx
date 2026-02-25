'use client'

import { useIsMobile } from '@/hooks/use-mobile'
import { Path } from '@/lib/path'
import { Dialog, DialogOverlay, DialogPortal, DialogTitle } from '@r2-drive/ui/components/dialog'
import { UIR2Item } from '@r2-drive/utils/types/item'
import * as DialogPrimitive from '@radix-ui/react-dialog'
import { useCallback, useEffect, useRef, useState } from 'react'
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
  const isMobile = useIsMobile()
  const [toolbarHidden, setToolbarHidden] = useState(false)

  const handleControlsHiddenChange = useCallback((hidden: boolean) => {
    if (isMobile) {
      setToolbarHidden(hidden)
    }
  }, [isMobile])

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

  if (!item) return null

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogPortal>
        <DialogOverlay className="bg-black/90" />
        <DialogPrimitive.Content
          ref={contentRef}
          className="fixed inset-0 z-50 flex flex-col outline-none"
          onPointerDownOutside={(e) => e.preventDefault()}
          aria-describedby={undefined}
        >
          <DialogTitle className="sr-only">File Preview: {item.path.name}</DialogTitle>

          {isMobile ? (
            // Mobile: toolbar overlays content, content takes full screen
            <>
              <div className="absolute top-0 left-0 right-0 z-10">
                <FileViewerToolbar
                  item={item}
                  currentIndex={currentIndex}
                  totalItems={items.length}
                  onClose={onClose}
                  onPrevious={onPrevious}
                  onNext={onNext}
                  onDownload={() => onDownload(item.path)}
                  hidden={toolbarHidden}
                />
              </div>
              <div className="flex-1 flex items-center justify-center overflow-auto min-h-0">
                <FileViewerContent item={item} onControlsHiddenChange={handleControlsHiddenChange} />
              </div>
            </>
          ) : (
            // Desktop: toolbar takes space, content below
            <>
              <FileViewerToolbar
                item={item}
                currentIndex={currentIndex}
                totalItems={items.length}
                onClose={onClose}
                onPrevious={onPrevious}
                onNext={onNext}
                onDownload={() => onDownload(item.path)}
              />
              <div className="flex-1 flex items-center justify-center overflow-auto p-4 min-h-0">
                <FileViewerContent item={item} />
              </div>
            </>
          )}
        </DialogPrimitive.Content>
      </DialogPortal>
    </Dialog>
  )
}
