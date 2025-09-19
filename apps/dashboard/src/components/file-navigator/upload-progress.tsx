import React, { useEffect } from 'react'
import { Progress } from '@workspace/ui/components/progress'
import { CheckCircle, Upload, XCircle, Zap } from 'lucide-react'
import { type ItemUploadProgress } from '@/types/upload'
import { formatBytes } from '@/lib/file-utils'


export function UploadProgress({ uploads }: { uploads: ItemUploadProgress[] }) {
  const [isVisible, setIsVisible] = React.useState(true)

  useEffect(() => {
    if (uploads.length > 0) {
      setIsVisible(true)
    }
  }, [uploads])

  if (!isVisible || uploads.length === 0) return null

  const completedUploads = uploads.filter((upload) => upload.success && !upload.errorMsg)
  const failedUploads = uploads.filter((upload) => upload.errorMsg)

  const overallProgress =
    uploads.length > 0 ? 
    Math.round((Math.min(uploads.reduce((sum, upload) => sum + (upload.uploadedBytes || 0), 0) / Math.max(uploads.reduce((sum, upload) => sum + (upload.totalBytes || 0), 0), 1), 1)) * 100) : 0

  // Calculate total bytes
  const totalUploadedBytes = uploads.reduce((sum, upload) => sum + (upload.uploadedBytes || 0), 0)
  const totalBytes = uploads.reduce((sum, upload) => sum + (upload.totalBytes || 0), 0)

  return (
    <div className="fixed bottom-4 right-4 w-80 bg-card border border-border rounded-lg shadow-lg p-4 z-50">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Upload className="h-4 w-4" />
          <span className="font-medium text-sm">
            Uploading {uploads.length} file{uploads.length !== 1 ? 's' : ''}
          </span>
        </div>
        <button
          onClick={() => {
            setIsVisible(false)
          }}
          className="text-muted-foreground hover:text-foreground"
        >
          ×
        </button>
      </div>

      {/* Overall Progress */}
      <div className="mb-3">
        <div className="flex justify-between text-xs text-muted-foreground mb-1">
          <span>Overall Progress</span>
          <span>
            {totalBytes > 0 
              ? `${formatBytes(totalUploadedBytes)} of ${formatBytes(totalBytes)}`
              : `${overallProgress}%`
            }
          </span>
        </div>
        <Progress value={overallProgress} className="h-2" />
      </div>

      {/* Individual File Progress */}
      <div className="max-h-32 overflow-y-auto space-y-2">
        {uploads.sort((a, b) => {
          // Put in progress uploads first, then completed, then failed
          // Then, sort by uploaded bytes descending
          if (a.success && !a.errorMsg) return 1
          if (b.success && !b.errorMsg) return -1
          if (a.errorMsg) return 1
          if (b.errorMsg) return -1
          return (b.uploadedBytes || 0) - (a.uploadedBytes || 0)
        })
        
        .map((upload, index) => (
          <div key={`${upload.fileName}-${index}`} className="text-xs">
            <div className="flex items-center gap-2 mb-1">
              {upload.errorMsg ? (
                <XCircle className="h-3 w-3 text-destructive flex-shrink-0" />
              ) : upload.success ? (
                <CheckCircle className="h-3 w-3 text-green-500 flex-shrink-0" />
              ) : (
                <div className="h-3 w-3 border border-muted-foreground rounded-full animate-spin flex-shrink-0" />
              )}
              <span className="truncate flex-1" title={upload.fileName}>
                {upload.fileName}
              </span>
              <span className="text-muted-foreground">
                {upload.errorMsg 
                  ? 'Failed' 
                  : (upload.uploadedBytes && upload.totalBytes) ? `${formatBytes(upload.uploadedBytes)} of ${formatBytes(upload.totalBytes)}` : null
                }
              </span>
            </div>
            {!upload.success && !upload.errorMsg && (
              <Progress value={upload.totalBytes ? Math.round((upload.uploadedBytes || 0) / upload.totalBytes * 100) : undefined} className="h-1" />
            )}
            {upload.errorMsg && (
              <div className="text-destructive text-xs mt-1 truncate" title={upload.errorMsg}>
                {upload.errorMsg}
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Summary */}
      {(completedUploads.length > 0 || failedUploads.length > 0) && (
        <div className="mt-3 pt-2 border-t border-border text-xs text-muted-foreground">
          {completedUploads.length > 0 && <div>✓ {completedUploads.length} completed</div>}
          {failedUploads.length > 0 && (
            <div className="text-destructive">✗ {failedUploads.length} failed</div>
          )}
        </div>
      )}
    </div>
  )
}
