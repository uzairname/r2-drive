'use client'

import { DownloadProgress } from '@/components/bucket-navigator/download-progress'
import { UploadProgress } from '@/components/bucket-navigator/upload-progress'
import { FileViewerDialog, useFileViewer } from '@/components/file-viewer'
import { useFileOperations } from '@/hooks/file-operations'
import { CanWriteInside, usePermissions } from '@/hooks/use-permissions'
import { useBucketInfo } from '@/hooks/use-bucket-info'
import { useDialogs } from '@/hooks/use-dialogs'
import { useFileExplorer } from '@/hooks/use-file-explorer'
import { useViewPreference } from '@/hooks/use-view-preference'
import { Paths } from '@/lib/path'
import { Path } from '@/lib/path'
import { useRouter, useSearchParams } from 'next/navigation'
import { useEffect, useRef, useState } from 'react'
import { R2Breadcrumbs } from './bucket-navigator/breadcrumbs'
import { CompressionDialog } from './bucket-navigator/compression-dialog'
import { CopyLinkButton } from './bucket-navigator/copy-link-button'
import { CreateFolderDialog } from './bucket-navigator/create-folder-dialog'
import { DeleteConfirmationDialog } from './bucket-navigator/delete-confirmation-dialog'
import { DropZone } from './bucket-navigator/drop-zone'
import { FileActionButtons } from './bucket-navigator/file-action-buttons'
import { R2FileTable } from './bucket-navigator/file-table'
import { GalleryView } from './bucket-navigator/gallery-view'
import { OverwriteConfirmationDialog } from './bucket-navigator/overwrite-confirmation-dialog'
import { RenameDialog } from './bucket-navigator/rename-dialog'
import { R2SelectionInfo } from './bucket-navigator/selection-info'
import { ShareDialog } from './bucket-navigator/share-dialog'
import { ViewToggle } from './bucket-navigator/view-toggle'

export function BucketNavigator() {
  const { bucketName } = useBucketInfo()
  const fileExplorer = useFileExplorer()
  const dialogs = useDialogs()
  const { canWriteInside } = usePermissions()
  const viewer = useFileViewer(fileExplorer.sortedItems)
  const searchParams = useSearchParams()
  const router = useRouter()
  const hasHandledPreviewRef = useRef(false)
  const { viewMode, setViewMode, isMobile, effectiveViewMode } = useViewPreference()

  // Handle preview query parameter (from file share links)
  const previewKey = searchParams.get('preview')
  useEffect(() => {
    if (hasHandledPreviewRef.current) return
    if (!previewKey) return
    if (fileExplorer.isLoading) return
    if (fileExplorer.sortedItems.length === 0) return

    // Find the item to preview
    const itemToPreview = fileExplorer.sortedItems.find(
      (item) => item.path.key === previewKey
    )

    if (itemToPreview) {
      hasHandledPreviewRef.current = true
      viewer.openViewer(itemToPreview)

      // Remove preview param from URL without triggering navigation
      const newParams = new URLSearchParams(searchParams.toString())
      newParams.delete('preview')
      const queryString = newParams.toString()
      router.replace(`/explorer${queryString ? `?${queryString}` : ''}`, {
        scroll: false,
      })
    }
  }, [previewKey, fileExplorer.isLoading, fileExplorer.sortedItems, viewer, searchParams, router])

  // Reset the ref when preview param changes (for subsequent share links)
  useEffect(() => {
    if (!previewKey) {
      hasHandledPreviewRef.current = false
    }
  }, [previewKey])

  // Current folder path for permission checks
  const currentPathKey = fileExplorer.path.key

  // Share dialog state
  const [showShareDialog, setShowShareDialog] = useState(false)
  const [itemToShare, setItemToShare] = useState<Path | null>(null)

  const handleShareItem = (path: Path) => {
    setItemToShare(path)
    setShowShareDialog(true)
  }

  // Get current file names for overwrite checking
  const currentFiles = fileExplorer.items
    .filter((item) => !item.path.isFolder)
    .map((item) => item.path.name)

  const ops = useFileOperations({
    path: fileExplorer.path,
    onFilesChange: async () => {
      await fileExplorer.refreshItems(fileExplorer.path)
    },
    currentFiles,
  })

  return (
    <>
      {/* Main Content */}
      <div className="flex-1 p-4">
        {/* Breadcrumbs & Copy Link */}
        <div className="mb-4">
          <nav className="overflow-hidden">
            <div className="flex items-center justify-between">
              <R2Breadcrumbs
                bucketName={bucketName}
                path={fileExplorer.path}
                onClick={fileExplorer.setPath}
              />
              <div className="flex items-center gap-2">
                {!isMobile && <ViewToggle viewMode={viewMode} onToggle={setViewMode} />}
                <CopyLinkButton path={fileExplorer.path} />
              </div>
            </div>
          </nav>
        </div>

        {/* File Table / Gallery */}
        <DropZone
          onFileDrop={ops.upload.uploadFiles}
          className="border border-border rounded-lg bg-card overflow-hidden"
          disabled={!canWriteInside(currentPathKey)}
        >
          {effectiveViewMode === 'table' ? (
            <R2FileTable
              items={fileExplorer.sortedItems}
              selectedItems={fileExplorer.selectedItemKeys}
              onItemSelect={fileExplorer.onItemSelect}
              onSelectAll={fileExplorer.onSelectAll}
              onFolderClick={fileExplorer.setPath}
              onDeleteItem={ops.delete.onDeleteItem}
              onRenameItem={ops.rename.onRenameItem}
              onDownloadItems={ops.download.downloadItems}
              onShareItem={handleShareItem}
              onPreviewItem={viewer.openViewer}
              tableSort={{
                sortKey: fileExplorer.sortKey,
                sortDirection: fileExplorer.sortDirection,
                onSort: fileExplorer.onSort,
              }}
              isLoading={fileExplorer.isLoading}
            />
          ) : (
            <GalleryView
              items={fileExplorer.sortedItems}
              selectedItems={fileExplorer.selectedItemKeys}
              onItemSelect={fileExplorer.onItemSelect}
              onFolderClick={fileExplorer.setPath}
              onDeleteItem={ops.delete.onDeleteItem}
              onRenameItem={ops.rename.onRenameItem}
              onDownloadItems={ops.download.downloadItems}
              onShareItem={handleShareItem}
              onPreviewItem={viewer.openViewer}
              isLoading={fileExplorer.isLoading}
            />
          )}
        </DropZone>

        {/* File Action Btns */}
        <CanWriteInside path={currentPathKey}>
          <FileActionButtons
            onUploadFile={ops.upload.triggerFileUpload}
            onUploadFolder={ops.upload.triggerFolderUpload}
            onCreateFolder={dialogs.openCreateFolderDialog}
          />
        </CanWriteInside>

        {/* Selection Info */}
        <R2SelectionInfo
          count={fileExplorer.selectedItemKeys.length}
          selectedKeys={fileExplorer.selectedItemKeys}
          onDeleteClick={() =>
            ops.delete.onDeleteItems(fileExplorer.selectedItemKeys, fileExplorer.items)
          }
          onDownload={() =>
            ops.download.downloadItems(fileExplorer.selectedItemKeys.map((i) => Paths.fromR2Key(i)))
          }
          onClose={() => fileExplorer.deselectItems()}
          isDeleting={ops.delete.isDeleting}
          isDownloading={ops.download.isDownloading}
        />
      </div>

      {/* Hidden File Inputs */}
      <input
        type="file"
        ref={ops.upload.fileInputRef}
        style={{ display: 'none' }}
        onChange={ops.upload.uploadFromHTMLInput}
        multiple
      />
      <input
        type="file"
        ref={ops.upload.folderInputRef}
        style={{ display: 'none' }}
        onChange={ops.upload.uploadFromHTMLInput}
        multiple
        {...{ webkitdirectory: '' }}
      />

      {/* Upload Progress Indicator */}
      <UploadProgress uploads={ops.upload.uploadProgress} onCancel={ops.upload.cancelAllUploads} />

      {/* Download Progress Indicator */}
      <DownloadProgress
        downloads={ops.download.downloadProgress}
        isZipping={ops.download.isZipping}
        onCancel={ops.download.cancelDownload}
      />

      {/* Create Folder Dialog */}
      <CreateFolderDialog
        open={dialogs.showCreateFolderDialog}
        onOpenChange={dialogs.setShowCreateFolderDialog}
        onCreateFolder={fileExplorer.onCreateFolder}
      />

      {/* Overwrite Confirmation Dialog */}
      <OverwriteConfirmationDialog
        open={ops.upload.showOverwriteConfirmDialog}
        onOpenChange={ops.upload.setShowOverwriteConfirmDialog}
        files={ops.upload.overwriteFiles}
        onConfirm={ops.upload.confirmOverwrite}
        onCancel={ops.upload.closeOverwriteConfirmDialog}
      />

      {/* Compression Dialog */}
      <CompressionDialog
        open={ops.upload.showCompressionDialog}
        onOpenChange={ops.upload.setShowCompressionDialog}
        files={ops.upload.compressionFiles}
        shouldCompress={ops.upload.shouldCompress}
        onShouldCompressChange={ops.upload.setShouldCompress}
        onConfirm={ops.upload.confirmCompression}
        onCancel={ops.upload.closeCompressionDialog}
        isCompressing={ops.upload.isCompressing}
      />

      {/* Delete Confirmation Dialog */}
      <DeleteConfirmationDialog
        open={ops.delete.showDeleteDialog}
        onOpenChange={ops.delete.setShowDeleteDialog}
        onConfirmDelete={ops.delete.onConfirmDelete}
        items={ops.delete.itemsToDelete}
        isDeleting={ops.delete.isDeleting}
      />

      {/* Rename Dialog */}
      <RenameDialog
        show={ops.rename.showRenameDialog}
        onOpenChange={ops.rename.setShowRenameDialog}
        itemPath={ops.rename.itemToRename}
        onSuccess={async () => {
          await fileExplorer.refreshItems(fileExplorer.path)
        }}
      />

      {/* Share Dialog */}
      <ShareDialog
        open={showShareDialog}
        onOpenChange={(open) => {
          setShowShareDialog(open)
          if (!open) setItemToShare(null)
        }}
        itemPath={itemToShare}
      />

      {/* File Viewer Dialog */}
      <FileViewerDialog
        isOpen={viewer.isOpen}
        item={viewer.currentItem}
        items={viewer.previewableItems}
        currentIndex={viewer.currentIndex}
        onClose={viewer.closeViewer}
        onNext={viewer.goToNext}
        onPrevious={viewer.goToPrevious}
        onDownload={(path) => ops.download.downloadItems([path])}
      />
    </>
  )
}
