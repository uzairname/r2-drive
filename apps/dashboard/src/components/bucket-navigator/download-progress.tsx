import { Progress } from '@r2-drive/ui/components/progress'
import { formatBytes } from '@r2-drive/utils/file-utils'
import { ItemDownloadProgress } from '@r2-drive/utils/types/item'
import { Archive, CheckCircle, Download, XCircle } from 'lucide-react'
import React, { useEffect } from 'react'
import { TruncatedText } from './truncated-text'

export function DownloadProgress({
  downloads,
  isZipping,
  onCancel,
}: {
  downloads: ItemDownloadProgress[]
  isZipping: boolean
  onCancel: () => void
}) {
  const [isVisible, setIsVisible] = React.useState(true)

  useEffect(() => {
    if (downloads.length > 0 || isZipping) {
      setIsVisible(true)
    }
  }, [downloads, isZipping])

  if (!isVisible || (downloads.length === 0 && !isZipping)) return null

  const completedDownloads = downloads.filter((d) => d.status === 'completed')
  const failedDownloads = downloads.filter((d) => d.status === 'error')

  const overallProgress =
    downloads.length > 0
      ? Math.round(
          Math.min(
            downloads.reduce((sum, d) => sum + d.downloadedBytes, 0) /
              Math.max(
                downloads.reduce((sum, d) => sum + d.totalBytes, 0),
                1
              ),
            1
          ) * 100
        )
      : 0

  // Calculate total bytes
  const totalDownloadedBytes = downloads.reduce((sum, d) => sum + d.downloadedBytes, 0)
  const totalBytes = downloads.reduce((sum, d) => sum + d.totalBytes, 0)

  return (
    <div className="fixed bottom-4 right-4 left-4 sm:left-auto sm:w-100 sm:max-w-[calc(100vw-2rem)] bg-card border border-border rounded-lg shadow-lg p-5 z-50">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          {isZipping ? (
            <Archive className="h-5 w-5 animate-pulse" />
          ) : (
            <Download className="h-5 w-5" />
          )}
          <span className="font-medium text-base">
            {isZipping
              ? 'Creating zip file...'
              : `Downloading ${downloads.length} file${downloads.length !== 1 ? 's' : ''}`}
          </span>
        </div>
        <button
          onClick={() => {
            setIsVisible(false)
            onCancel()
          }}
          className="text-muted-foreground hover:text-foreground text-xl"
          title="Cancel download"
        >
          ×
        </button>
      </div>

      {/* Overall Progress */}
      {!isZipping && (
        <div className="mb-4">
          <div className="flex justify-between text-sm text-muted-foreground mb-2">
            <span>Overall Progress</span>
            <span>
              {totalBytes > 0
                ? `${formatBytes(totalDownloadedBytes)} of ${formatBytes(totalBytes)}`
                : `${overallProgress}%`}
            </span>
          </div>
          <Progress value={overallProgress} className="h-2.5" />
        </div>
      )}

      {/* Individual File Progress */}
      {!isZipping && (
        <div className="max-h-40 overflow-y-auto space-y-2.5">
          {downloads
            .sort((a, b) => {
              // Put in progress downloads first, then completed, then failed
              // Then, sort by downloaded bytes descending
              if (a.status === 'completed') return 1
              if (b.status === 'completed') return -1
              if (a.status === 'error') return 1
              if (b.status === 'error') return -1
              return b.downloadedBytes - a.downloadedBytes
            })
            .map((download, index) => (
              <div key={`${download.key}-${index}`} className="text-sm">
                <div className="flex items-center gap-2 mb-1.5">
                  {download.status === 'error' ? (
                    <XCircle className="h-4 w-4 text-destructive flex-shrink-0" />
                  ) : download.status === 'completed' ? (
                    <CheckCircle className="h-4 w-4 text-green-500 flex-shrink-0" />
                  ) : (
                    <div className="h-4 w-4 border-2 border-muted-foreground rounded-full animate-spin flex-shrink-0" />
                  )}
                  <TruncatedText className="flex-1 text-sm">
                    {download.fileName}
                  </TruncatedText>
                  <span className="text-muted-foreground text-xs">
                    {download.status === 'error'
                      ? 'Failed'
                      : download.status === 'downloading'
                        ? `${formatBytes(download.downloadedBytes)} of ${formatBytes(download.totalBytes)}`
                        : null}
                  </span>
                </div>
                {download.status === 'downloading' && (
                  <Progress
                    value={
                      download.totalBytes > 0
                        ? Math.round((download.downloadedBytes / download.totalBytes) * 100)
                        : undefined
                    }
                    className="h-1.5"
                  />
                )}
                {download.status === 'error' && download.errorMsg && (
                  <div
                    className="text-destructive text-sm mt-1 truncate"
                    title={download.errorMsg}
                  >
                    {download.errorMsg}
                  </div>
                )}
              </div>
            ))}
        </div>
      )}

      {/* Summary */}
      {(completedDownloads.length > 0 || failedDownloads.length > 0) && !isZipping && (
        <div className="mt-4 pt-3 border-t border-border text-sm text-muted-foreground">
          {completedDownloads.length > 0 && <div>✓ {completedDownloads.length} completed</div>}
          {failedDownloads.length > 0 && (
            <div className="text-destructive">✗ {failedDownloads.length} failed</div>
          )}
        </div>
      )}
    </div>
  )
}
