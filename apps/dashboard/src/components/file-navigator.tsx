'use client'

import { AdminOnly } from '@/hooks/use-admin'
import { useDialogs } from '@/hooks/use-dialogs'
import { useFileDelete } from '@/hooks/use-file-delete'
import { useFileDownload } from '@/hooks/use-file-download'
import { useFileExplorer } from '@/hooks/use-file-explorer'
import { useFileOperations } from '@/hooks/use-file-operations'
import { useFileUpload } from '@/hooks/use-file-upload'
import { Path, Paths } from '@/lib/path'
import { ItemUploadProgress, UploadProgress } from '@workspace/ui/components/upload-progress'
import { R2Breadcrumbs } from './file-navigator/breadcrumbs'
import { CopyLinkButton } from './file-navigator/copy-link-button'
import { CreateFolderDialog } from './file-navigator/create-folder-dialog'
import { DeleteConfirmationDialog } from './file-navigator/delete-confirmation-dialog'
import { FileActionButtons } from './file-navigator/file-action-buttons'
import { R2FileTable } from './file-navigator/file-table'
import { R2SelectionInfo } from './file-navigator/selection-info'

export function R2BucketNavigator() {
  const fileExplorer = useFileExplorer()
  const fileOperations = useFileOperations()

  // Extract upload functionality
  const upload = useFileUpload({
    currentPath: fileExplorer.path,
    onUpload: async (
      files: File[],
      currentPath: Path,
      onProgress?: (progress: ItemUploadProgress) => void
    ) => {
      await fileOperations.handleUpload(files, currentPath, onProgress)
      fileExplorer.fetchItems(currentPath)
    },
  })

  // Extract delete functionality
  const deleteOps = useFileDelete({
    onDelete: async (keysToDelete: string[]) => {
      await fileOperations.handleDelete(keysToDelete, () => {
        fileExplorer.fetchItems(fileExplorer.path)
      })
    },
  })

  // Extract download functionality
  const download = useFileDownload({
    downloadItems: fileOperations.handleDownload,
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
                onClick={fileExplorer.navigateToFolder}
              />
              <CopyLinkButton path={fileExplorer.path} />
            </div>
          </nav>
        </div>

        {/* File Table */}
        <R2FileTable
          items={fileExplorer.sortedItems}
          selectedItems={fileExplorer.selectedItemKeys}
          onItemSelect={fileExplorer.onItemSelect}
          onSelectAll={fileExplorer.onSelectAll}
          onFolderClick={fileExplorer.navigateToFolder}
          onDeleteItem={deleteOps.onDeleteItem}
          onDownloadItem={download.downloadItem}
          tableSort={{
            sortKey: fileExplorer.sortKey,
            sortDirection: fileExplorer.sortDirection,
            onSort: fileExplorer.onSort,
          }}
        />

        {/* File Action Btns */}
        <AdminOnly>
          <FileActionButtons
            onUploadFile={upload.triggerFileUpload}
            onUploadFolder={upload.triggerFolderUpload}
            onCreateFolder={dialogs.openCreateFolderDialog}
          />
        </AdminOnly>

        {/* Selection Info */}
        <R2SelectionInfo
          count={fileExplorer.selectedItemKeys.length}
          onDeleteClick={() =>
            deleteOps.onDeleteSelected(fileExplorer.selectedItemKeys, fileExplorer.items)
          }
          onDownload={() =>
            download.downloadMultiple(fileExplorer.selectedItemKeys.map((i) => Paths.fromR2Key(i)))
          }
          isDeleting={deleteOps.isDeleting}
          isDownloading={download.isDownloading}
        />
      </div>

      {/* Hidden File Inputs */}
      <input
        type="file"
        ref={upload.fileInputRef}
        style={{ display: 'none' }}
        onChange={upload.upload}
        multiple
      />
      <input
        type="file"
        ref={upload.folderInputRef}
        style={{ display: 'none' }}
        onChange={upload.upload}
        multiple
        {...{ webkitdirectory: '' }}
      />

      {/* Upload Progress Indicator */}
      <UploadProgress uploads={upload.uploadProgress} />

      {/* Create Folder Dialog */}
      <CreateFolderDialog
        open={dialogs.showCreateFolderDialog}
        onOpenChange={dialogs.setShowCreateFolderDialog}
        onCreateFolder={fileExplorer.onCreateFolder}
      />

      {/* Delete Confirmation Dialog */}
      <DeleteConfirmationDialog
        open={deleteOps.showDeleteDialog}
        onOpenChange={deleteOps.setShowDeleteDialog}
        onConfirmDelete={deleteOps.handleConfirmDelete}
        itemNames={deleteOps.itemsToDelete.names}
        isDeleting={deleteOps.isDeleting}
      />
    </>
  )
}
