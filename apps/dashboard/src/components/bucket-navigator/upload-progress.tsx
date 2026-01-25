import { Progress } from '@r2-drive/ui/components/progress'
import { formatBytes } from '@r2-drive/utils/file-utils'
import { ItemUploadProgress } from '@r2-drive/utils/types/item'
import { CheckCircle, Upload, XCircle } from 'lucide-react'
import React, { useEffect } from 'react'

export function UploadProgress({
  uploads,
  onCancel,
}: {
  uploads: ItemUploadProgress[]
  onCancel: () => Promise<void>
}) {
  const [isVisible, setIsVisible] = React.useState(true)

  useEffect(() => {
    console.log('UploadProgress - uploads changed:', uploads)
    if (uploads.length > 0) {
      setIsVisible(true)
    }
  }, [uploads])

  if (!isVisible || uploads.length === 0) return null

  const completedUploads = uploads.filter((upload) => upload.success && !upload.errorMsg)
  const failedUploads = uploads.filter((upload) => upload.errorMsg)

  const overallProgress =
    uploads.length > 0
      ? Math.round(
          Math.min(
            uploads.reduce((sum, upload) => sum + (upload.uploadedBytes || 0), 0) /
              Math.max(
                uploads.reduce((sum, upload) => sum + (upload.totalBytes || 0), 0),
                1
              ),
            1
          ) * 100
        )
      : 0

  // Calculate total bytes
  const totalUploadedBytes = uploads.reduce((sum, upload) => sum + (upload.uploadedBytes || 0), 0)
  const totalBytes = uploads.reduce((sum, upload) => sum + (upload.totalBytes || 0), 0)

  return (
    <div className="fixed bottom-4 right-4 left-4 sm:left-auto sm:w-100 sm:max-w-[calc(100vw-2rem)] bg-card border border-border rounded-lg shadow-lg p-5 z-50">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Upload className="h-5 w-5" />
          <span className="font-medium text-base">
            Uploading {uploads.length} file{uploads.length !== 1 ? 's' : ''}
          </span>
        </div>
        <button
          onClick={async () => {
            setIsVisible(false)
            await onCancel()
          }}
          className="text-muted-foreground hover:text-foreground text-xl"
          title="Close or cancel"
        >
          ×
        </button>
      </div>

      {/* Overall Progress */}
      <div className="mb-4">
        <div className="flex justify-between text-sm text-muted-foreground mb-2">
          <span>Overall Progress</span>
          <span>
            {totalBytes > 0
              ? `${formatBytes(totalUploadedBytes)} of ${formatBytes(totalBytes)}`
              : `${overallProgress}%`}
          </span>
        </div>
        <Progress value={overallProgress} className="h-2.5" />
      </div>

      {/* Individual File Progress */}
      <div className="max-h-40 overflow-y-auto space-y-2.5">
        {uploads
          .sort((a, b) => {
            // Put in progress uploads first, then completed, then failed
            // Then, sort by uploaded bytes descending
            if (a.success && !a.errorMsg) return 1
            if (b.success && !b.errorMsg) return -1
            if (a.errorMsg) return 1
            if (b.errorMsg) return -1
            return (b.uploadedBytes || 0) - (a.uploadedBytes || 0)
          })

          .map((upload, index) => (
            <div key={`${upload.fileName}-${index}`} className="text-sm">
              <div className="flex items-center gap-2 mb-1.5">
                {upload.errorMsg ? (
                  <XCircle className="h-4 w-4 text-destructive flex-shrink-0" />
                ) : upload.success ? (
                  <CheckCircle className="h-4 w-4 text-green-500 flex-shrink-0" />
                ) : (
                  <div className="h-4 w-4 border-2 border-muted-foreground rounded-full animate-spin flex-shrink-0" />
                )}
                <span className="truncate flex-1" title={upload.fileName}>
                  {upload.fileName}
                </span>
                <span className="text-muted-foreground text-xs">
                  {upload.errorMsg
                    ? 'Failed'
                    : upload.uploadedBytes && upload.totalBytes
                      ? `${formatBytes(upload.uploadedBytes)} of ${formatBytes(upload.totalBytes)}`
                      : null}
                </span>
              </div>
              {!upload.success && !upload.errorMsg && (
                <Progress
                  value={
                    upload.totalBytes
                      ? Math.round(((upload.uploadedBytes || 0) / upload.totalBytes) * 100)
                      : undefined
                  }
                  className="h-1.5"
                />
              )}
              {upload.errorMsg && (
                <div className="text-destructive text-sm mt-1 truncate" title={upload.errorMsg}>
                  {upload.errorMsg}
                </div>
              )}
            </div>
          ))}
      </div>

      {/* Summary */}
      {(completedUploads.length > 0 || failedUploads.length > 0) && (
        <div className="mt-4 pt-3 border-t border-border text-sm text-muted-foreground">
          {completedUploads.length > 0 && <div>✓ {completedUploads.length} completed</div>}
          {failedUploads.length > 0 && (
            <div className="text-destructive">✗ {failedUploads.length} failed</div>
          )}
        </div>
      )}
    </div>
  )
}
