import { AdminOnly } from '@/hooks/use-admin'
import { Button } from '@r2-drive/ui/components/button'
import { Download, Trash2, X } from 'lucide-react'
import { useEffect } from 'react'

export interface R2SelectionInfoProps {
  count: number
  onDeleteClick?: () => void
  onDownload?: () => void
  onClose?: () => void
  isDeleting?: boolean
  isDownloading?: boolean
}

export function R2SelectionInfo({
  count,
  onDeleteClick,
  onDownload,
  onClose,
  isDeleting,
  isDownloading,
}: R2SelectionInfoProps) {

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && onClose) {
        onClose()
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [onClose])

  if (count === 0) return null
  return (
    <div className="fixed bottom-5 left-1/2 transform -translate-x-1/2 z-50 p-4 bg-background border border-border rounded-lg shadow-lg backdrop-blur-sm">
      <div className="flex items-center justify-between gap-4">
        
        {onClose && (
          <Button
            variant="ghost"
            size="sm"
            onClick={onClose}
            className="text-muted-foreground hover:bg-muted"
          >
            <X className="h-4 w-4" />
          </Button>
        )}
        <p className="text-sm text-muted-foreground whitespace-nowrap">
          {count} item{count !== 1 ? 's' : ''} selected
        </p>
        <div className="flex items-center gap-2">
          {onDownload && (
            <Button variant="ghost" size="sm" onClick={onDownload} disabled={isDownloading}>
              <Download className="h-4 w-4" />
            </Button>
          )}
          <AdminOnly>
            {onDeleteClick && (
              <Button
                variant="ghost"
                size="sm"
                onClick={onDeleteClick}
                disabled={isDeleting}
                className="text-destructive hover:text-destructive hover:bg-destructive/50"
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            )}
          </AdminOnly>
        </div>
      </div>
    </div>
  )
}
