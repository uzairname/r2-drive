"use client"

import React from "react";
import { R2Breadcrumbs } from "./file-navigator/breadcrumbs";
import { R2FileTable } from "./file-navigator/file-table";
import { R2SelectionInfo } from "./file-navigator/selection-info";
import { DeleteConfirmationDialog } from "./file-navigator/delete-confirmation-dialog";
import { UploadProgress, UploadProgressItem } from "@workspace/ui/components/upload-progress";
import { CreateFolderDialog } from "./file-navigator/create-folder-dialog";
import { FileActionButtons } from "./file-navigator/file-action-buttons";
import { AdminOnly } from "@/hooks/use-admin";
import { useFileUpload } from "@/hooks/use-file-upload";
import { useFileDelete } from "@/hooks/use-file-delete";
import { useFileDownload } from "@/hooks/use-file-download";
import { useDialogs } from "@/hooks/use-dialogs";
import { useFileOperations } from "@/hooks/use-file-operations";
import { useFileExplorer } from "@/hooks/use-file-explorer";
import { Path, Paths } from "@/lib/path-system/path";


export function R2BucketNavigator() {
  
  const fileExplorer = useFileExplorer();
  const fileOperations = useFileOperations();

  const handleUpload = async (files: File[], currentPath: Path, onProgress?: (progress: UploadProgressItem) => void) => {
    await fileOperations.handleUpload(files, currentPath, onProgress, () => {
      fileExplorer.fetchItems(currentPath);
    });
  };

  const handleDelete = async (keysToDelete: string[]) => {
    await fileOperations.handleDelete(keysToDelete, () => {
      fileExplorer.fetchItems(fileExplorer.path);
    });
  };

  // Extract upload functionality
  const upload = useFileUpload({
    currentPath: fileExplorer.path,
    onUpload: handleUpload,
  });

  // Extract delete functionality
  const deleteOps = useFileDelete({
    onDelete: handleDelete,
  });

  // Extract download functionality
  const download = useFileDownload({
    downloadItems: fileOperations.handleDownload
  });

  // Extract dialog management
  const dialogs = useDialogs();

  return (
    <>

      {/* Main Content */}
      <div className="flex-1 p-6">
        {/* Breadcrumbs */}
        <div className="mb-6">
          <R2Breadcrumbs bucketName={fileExplorer.bucketName} path={fileExplorer.path} onClick={fileExplorer.navigateToFolder} />
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
        
        {/* File Actions */}
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
          onDeleteClick={() => deleteOps.onDeleteSelected(fileExplorer.selectedItemKeys, fileExplorer.items)}
          onDownload={() => download.downloadMultiple(fileExplorer.selectedItemKeys.map(i => Paths.fromR2Key(i)))}
          isDeleting={deleteOps.isDeleting}
          isDownloading={download.isDownloading}
        />
      </div>
      
      {/* Hidden File Inputs */}
      <input
        type="file"
        ref={upload.fileInputRef}
        style={{ display: "none" }}
        onChange={upload.handleFileUpload}
        multiple
      />
      <input
        type="file"
        ref={upload.folderInputRef}
        style={{ display: "none" }}
        onChange={upload.handleFolderUpload}
        multiple
        {...{ webkitdirectory: "" }}
      />

      {/* Upload Progress Indicator */}
      <UploadProgress
        uploads={upload.uploadProgress}
        isVisible={upload.showUploadProgress}
        onClose={upload.closeUploadProgress}
      />

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
  );
}
