'use client'

import { UploadProgress } from '@/components/bucket-navigator/upload-progress'
import { useFileOperations } from '@/hooks/file-operations'
import { AdminOnly } from '@/hooks/use-admin'
import { useDialogs } from '@/hooks/use-dialogs'
import { useFileExplorer } from '@/hooks/use-file-explorer'
import { Paths } from '@/lib/path'
import { R2Breadcrumbs } from './bucket-navigator/breadcrumbs'
import { CopyLinkButton } from './bucket-navigator/copy-link-button'
import { CreateFolderDialog } from './bucket-navigator/create-folder-dialog'
import { DeleteConfirmationDialog } from './bucket-navigator/delete-confirmation-dialog'
import { DropZone } from './bucket-navigator/drop-zone'
import { FileActionButtons } from './bucket-navigator/file-action-buttons'
import { R2FileTable } from './bucket-navigator/file-table'
import { R2SelectionInfo } from './bucket-navigator/selection-info'

export function BucketNavigator() {
  const fileExplorer = useFileExplorer()
  const ops = useFileOperations({
    path: fileExplorer.path,
    onFilesChange: async () => {
      await fileExplorer.refreshItems(fileExplorer.path)
    },
  })

  // Extract dialog management
  const dialogs = useDialogs()
  return (
    <>
      {/* Main Content */}
      <div className="flex-1 p-4">
        {/* Breadcrumbs & Copy Link */}
        <div className="mb-4">
          <nav className="overflow-hidden">
            <div className="flex items-center justify-between">
              <R2Breadcrumbs
                bucketName={fileExplorer.bucketName}
                path={fileExplorer.path}
                onClick={fileExplorer.setPath}
              />
              <CopyLinkButton path={fileExplorer.path} />
            </div>
          </nav>
        </div>

        {/* File Table */}
        <DropZone
          onFileDrop={ops.upload.uploadFiles}
          className="border border-border rounded-lg bg-card overflow-hidden"
        >
          <R2FileTable
            items={fileExplorer.sortedItems}
            selectedItems={fileExplorer.selectedItemKeys}
            onItemSelect={fileExplorer.onItemSelect}
            onSelectAll={fileExplorer.onSelectAll}
            onFolderClick={fileExplorer.setPath}
            onDeleteItem={ops.delete.onDeleteItem}
            onDownloadItems={ops.download.downloadItems}
            tableSort={{
              sortKey: fileExplorer.sortKey,
              sortDirection: fileExplorer.sortDirection,
              onSort: fileExplorer.onSort,
            }}
          />
        </DropZone>

        {/* File Action Btns */}
        <AdminOnly>
          <FileActionButtons
            onUploadFile={ops.upload.triggerFileUpload}
            onUploadFolder={ops.upload.triggerFolderUpload}
            onCreateFolder={dialogs.openCreateFolderDialog}
          />
        </AdminOnly>

        {/* Selection Info */}
        <R2SelectionInfo
          count={fileExplorer.selectedItemKeys.length}
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
      <UploadProgress uploads={ops.upload.uploadProgress} />

      {/* Create Folder Dialog */}
      <CreateFolderDialog
        open={dialogs.showCreateFolderDialog}
        onOpenChange={dialogs.setShowCreateFolderDialog}
        onCreateFolder={fileExplorer.onCreateFolder}
      />

      {/* Delete Confirmation Dialog */}
      <DeleteConfirmationDialog
        open={ops.delete.showDeleteDialog}
        onOpenChange={ops.delete.setShowDeleteDialog}
        onConfirmDelete={ops.delete.onConfirmDelete}
        items={ops.delete.itemsToDelete}
        isDeleting={ops.delete.isDeleting}
      />
    </>
  )
}
