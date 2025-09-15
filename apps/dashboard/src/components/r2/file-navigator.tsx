"use client"

import { HardDrive, Plus } from "lucide-react";
import { R2Breadcrumbs } from "./breadcrumbs";
import { R2FileTable, UIFileItem, TableSortProps } from "./file-table";
import { R2SelectionInfo } from "./selection-info";
import { Button } from "@workspace/ui/components/button";
import { Upload, FolderPlus } from "lucide-react";
import { UploadProgress, UploadProgressItem } from "@workspace/ui/components/upload-progress";
import React, { useRef, useState } from "react";
import { CreateFolderDialog } from "./create-folder-dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@workspace/ui/components/dropdown-menu";


export interface R2BucketNavigatorProps {
  bucketName: string;
  path: string[];
  items: UIFileItem[];
  selectedItems: string[];
  onFolderClick: (folderName: string) => void;
  onBreadcrumbClick: (index: number) => void;
  onItemSelect: (itemId: string) => void;
  onSelectAll: () => void;
  handleUpload: (files: File[], currentPath: string[], onProgress?: (progress: UploadProgressItem) => void) => Promise<void>;
  handleDelete: (selectedItems: string[]) => Promise<void>;
  handleDownload: (selectedItems: string[]) => Promise<void>;
  handleCreateFolder: (folderName: string) => Promise<{ success: boolean; errorMessage?: string }>;
  sortKey: "name" | "size" | "lastModified";
  sortDirection: "asc" | "desc";
  handleSort: (key: "name" | "size" | "lastModified") => void;
}

export function R2BucketNavigator({
  bucketName,
  path,
  items,
  selectedItems,
  onFolderClick,
  onBreadcrumbClick,
  onItemSelect,
  onSelectAll,
  handleUpload,
  handleDelete,
  handleDownload,
  handleCreateFolder,
  sortKey,
  sortDirection,
  handleSort,
}: R2BucketNavigatorProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const folderInputRef = useRef<HTMLInputElement>(null);
  const [isDeleting, setIsDeleting] = React.useState(false);
  const [isDownloading, setIsDownloading] = React.useState(false);
  const [uploadProgress, setUploadProgress] = React.useState<UploadProgressItem[]>([]);
  const [showUploadProgress, setShowUploadProgress] = React.useState(false);
  const [showCreateFolderDialog, setShowCreateFolderDialog] = useState(false);

  const handleUploadClick = () => {
    fileInputRef.current?.click();
  };

  const handleUploadFolderClick = () => {
    folderInputRef.current?.click();
  };

  const handleCreateFolderClick = () => {
    setShowCreateFolderDialog(true);
  };

  const handleProgressUpdate = (progress: UploadProgressItem) => {
    setUploadProgress(prev => {
      const updated = [...prev];
      const index = updated.findIndex(item => item.fileName === progress.fileName);
      if (index >= 0) {
        updated[index] = progress;
      } else {
        updated.push(progress);
      }
      return updated;
    });
  };

  const handleFolderChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    
    const fileArray = Array.from(files);
    setShowUploadProgress(true);
    setUploadProgress(fileArray.map(file => ({
      fileName: file.name,
      progress: 0,
      completed: false
    })));
    
    await handleUpload(fileArray, path, handleProgressUpdate);
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    
    const fileArray = Array.from(files);
    setShowUploadProgress(true);
    setUploadProgress(fileArray.map(file => ({
      fileName: file.name,
      progress: 0,
      completed: false
    })));
    
    await handleUpload(fileArray, path, handleProgressUpdate);
  };

  const onDeleteSelected = async () => {
    if (selectedItems.length === 0) return;
    
    setIsDeleting(true);
    try {
      await handleDelete(selectedItems);
    } catch (error) {
      console.error("Error deleting items:", error);
    } finally {
      setIsDeleting(false);
    }
  };

  const onDownloadSelected = async () => {
    if (selectedItems.length === 0) return;
    
    setIsDownloading(true);
    try {
      await handleDownload(selectedItems);
    } catch (error) {
      console.error("Error downloading items:", error);
    } finally {
      setIsDownloading(false);
    }
  };

  return (
    <div className="flex flex-col h-screen">
      {/* Header */}
      <header className="border-b border-border bg-card px-6 py-4">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-semibold text-foreground">Cloudflare R2 Drive</h1>
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <HardDrive className="h-4 w-4" />
            <span>Bucket: {bucketName}</span>
          </div>
        </div>
      </header>
      {/* Main Content */}
      <div className="flex-1 p-6">
        {/* Upload Actions - moved above breadcrumbs */}
        <div className="flex justify-end mb-4">
          <input
            type="file"
            ref={fileInputRef}
            style={{ display: "none" }}
            onChange={handleFileChange}
            multiple
          />
          <input
            type="file"
            ref={folderInputRef}
            style={{ display: "none" }}
            onChange={handleFolderChange}
            multiple
            {...{ webkitdirectory: "" }}
          />
          
          {/* Desktop: Show individual buttons */}
          <div className="hidden md:flex gap-2">
            <Button variant="outline" size="sm" className="h-8" onClick={handleUploadClick}>
              <Upload className="h-4 w-4 mr-2" />
              Upload File
            </Button>
            <Button variant="outline" size="sm" className="h-8" onClick={handleUploadFolderClick}>
              <Upload className="h-4 w-4 mr-2" />
              Upload Folder
            </Button>
            <Button variant="outline" size="sm" className="h-8" onClick={handleCreateFolderClick}>
              <FolderPlus className="h-4 w-4 mr-2" />
              Create Folder
            </Button>
          </div>

          {/* Mobile: Show dropdown */}
          <div className="md:hidden">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm" className="h-8">
                  <Plus className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={handleUploadClick}>
                  <Upload className="h-4 w-4 mr-2" />
                  Upload File
                </DropdownMenuItem>
                <DropdownMenuItem onClick={handleUploadFolderClick}>
                  <Upload className="h-4 w-4 mr-2" />
                  Upload Folder
                </DropdownMenuItem>
                <DropdownMenuItem onClick={handleCreateFolderClick}>
                  <FolderPlus className="h-4 w-4 mr-2" />
                  Create Folder
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>

        {/* Breadcrumbs - now gets full width */}
        <div className="mb-6">
          <R2Breadcrumbs path={path} onClick={onBreadcrumbClick} />
        </div>
        <R2FileTable
          items={items}
          selectedItems={selectedItems}
          onItemSelect={onItemSelect}
          onSelectAll={onSelectAll}
          onFolderClick={onFolderClick}
          tableSort={{
            sortKey,
            sortDirection,
            onSort: handleSort,
          }}
        />
        <R2SelectionInfo 
          count={selectedItems.length} 
          onDelete={onDeleteSelected}
          onDownload={onDownloadSelected}
          isDeleting={isDeleting}
          isDownloading={isDownloading}
        />
      </div>
      
      {/* Upload Progress Indicator */}
      <UploadProgress
        uploads={uploadProgress}
        isVisible={showUploadProgress}
        onClose={() => setShowUploadProgress(false)}
      />

      {/* Create Folder Dialog */}
      <CreateFolderDialog
        open={showCreateFolderDialog}
        onOpenChange={setShowCreateFolderDialog}
        onCreateFolder={handleCreateFolder}
      />
    </div>
  );
}
