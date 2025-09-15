"use client";

import React, { useState, useEffect, useCallback } from "react";
import { listFiles } from "../../lib/actions";
import { R2BucketNavigator } from "@/components/r2/file-navigator";
import { deleteObjects, getObject } from "../../lib/actions";
import { UploadManager } from "../../lib/upload-utils";
import { FileItem } from "../../lib/r2-client";
import type { UIFileItem } from "@/components/r2/file-table";
import type { UploadProgressItem } from "@workspace/ui/components/upload-progress";


function formatFileSize(bytes: number): string {
  if (bytes === 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB", "TB", "PB", "EB", "ZB", "YB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`;
}

function toUiFileItem(item: FileItem, type: "file" | "folder"): UIFileItem {
  return {
    id: item.key || item.name,
    name: item.name,
    type,
    size: typeof item.size === "number" && type === "file" ? formatFileSize(item.size) : undefined,
    lastModified: item.lastModified instanceof Date ? item.lastModified.toISOString().slice(0, 10) : (item.lastModified || "")
  };
}

type SortKey = "name" | "size" | "lastModified";
type SortDirection = "asc" | "desc";

export default function ExplorerPage() {
  const [path, setPath] = useState<string[]>(["my-bucket"]);
  const [items, setItems] = useState<UIFileItem[]>([]);
  const [sortKey, setSortKey] = useState<SortKey>("name");
  const [sortDirection, setSortDirection] = useState<SortDirection>("asc");
  const [selectedItems, setSelectedItems] = useState<string[]>([]);
  const bucketName = path[0] || "";

  const fetchItems = useCallback(async (currentPath: string[]) => {
    const joined = currentPath.slice(1).join("/");
    const { objects, folders } = await listFiles(joined);
    setItems([
      ...folders.map(f => toUiFileItem(f, "folder")),
      ...objects.map(f => toUiFileItem(f, "file")),
    ]);
    setSelectedItems([]);
  }, []);

  useEffect(() => {
    fetchItems(path);
  }, [path, fetchItems]);

  // Sorting logic: folders always first, then sort by key/direction
  const sortedItems = React.useMemo(() => {
    const folders = items.filter(i => i.type === "folder");
    const files = items.filter(i => i.type === "file");
    const sortFn = (a: any, b: any) => {
      let aVal = a[sortKey] || "";
      let bVal = b[sortKey] || "";
      if (sortKey === "size") {
        // Parse size string to bytes for sorting
        const parse = (s: string) => {
          if (!s) return 0;
          const [num, unit] = s.split(" ");
          const units = ["B","KB","MB","GB","TB","PB","EB","ZB","YB"];
          const idx = units.indexOf(unit || "B");
          return parseFloat(num || "0") * Math.pow(1024, idx >= 0 ? idx : 0);
        };
        aVal = parse(aVal);
        bVal = parse(bVal);
      }
      if (sortKey === "lastModified") {
        aVal = new Date(aVal).getTime();
        bVal = new Date(bVal).getTime();
      }
      if (aVal < bVal) return sortDirection === "asc" ? -1 : 1;
      if (aVal > bVal) return sortDirection === "asc" ? 1 : -1;
      return 0;
    };
    return [
      ...folders.sort(sortFn),
      ...files.sort(sortFn),
    ];
  }, [items, sortKey, sortDirection]);

  const handleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortDirection(d => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(key);
      setSortDirection("asc");
    }
  };

  const handleFolderClick = (folderName: string) => {
    setPath(prev => [...prev, folderName]);
  };
  const handleBreadcrumbClick = (index: number) => {
    setPath(prev => prev.slice(0, index + 1));
  };
  const handleItemSelect = (itemId: string) => {
    setSelectedItems(prev => prev.includes(itemId) ? prev.filter(id => id !== itemId) : [...prev, itemId]);
  };
  const handleSelectAll = () => {
    if (selectedItems.length === items.length) {
      setSelectedItems([]);
    } else {
      setSelectedItems(items.map(item => item.id));
    }
  };

  const handleUpload = async (files: File[], currentPath: string[], onProgress?: (progress: UploadProgressItem) => void) => {
    const joined = currentPath.slice(1).join("/");
    
    // Create upload manager with progress callback
    const uploadManager = new UploadManager(
      (progress) => {
        // Forward progress updates to the file-navigator
        onProgress?.(progress);
      },
      (results) => {
        // Upload completed - refresh file list
        const successCount = results.filter(r => r.success).length;
        const failCount = results.filter(r => !r.success).length;
        console.log(`Upload completed: ${successCount} successful, ${failCount} failed`);
        fetchItems(currentPath);
      }
    );
    
    // Start the upload
    await uploadManager.uploadMultipleFiles(joined, files);
  };

  const handleDelete = async (selectedItemIds: string[]) => {
    // Convert item IDs to full keys for deletion
    const currentFolder = path.slice(1).join("/");
    const keysToDelete = selectedItemIds.map(itemId => {
      // If we're in a subfolder, prepend the current path
      return currentFolder ? `${currentFolder}/${itemId}` : itemId;
    });

    const result = await deleteObjects(keysToDelete);
    
    if (result.errors && result.errors.length > 0) {
      console.error("Some items failed to delete:", result.errors);
      // You could show a toast notification here
    }
    
    // Refresh the file list
    fetchItems(path);
  };

  const handleDownload = async (selectedItemIds: string[]) => {
    const currentFolder = path.slice(1).join("/");
    
    for (const itemId of selectedItemIds) {
      try {
        // Build the full key for the file
        const key = currentFolder ? `${currentFolder}/${itemId}` : itemId;
        
        // Get the file data
        const response = await getObject(key);
        
        if (response.ok) {
          // Create a blob from the response
          const blob = await response.blob();
          
          // Create a download link
          const url = URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url;
          a.download = itemId; // Use the item name as the download filename
          document.body.appendChild(a);
          a.click();
          document.body.removeChild(a);
          URL.revokeObjectURL(url);
        } else {
          console.error(`Failed to download ${itemId}: ${response.statusText}`);
        }
      } catch (error) {
        console.error(`Error downloading ${itemId}:`, error);
      }
    }
  };

  return (
    <div className="p-6 max-w-3xl mx-auto">
      <div className="mt-6">
        <R2BucketNavigator
          bucketName={bucketName}
          path={path}
          items={sortedItems}
          selectedItems={selectedItems}
          onFolderClick={handleFolderClick}
          onBreadcrumbClick={handleBreadcrumbClick}
          onItemSelect={handleItemSelect}
          onSelectAll={handleSelectAll}
          handleUpload={handleUpload}
          handleDelete={handleDelete}
          handleDownload={handleDownload}
          sortKey={sortKey}
          sortDirection={sortDirection}
          handleSort={handleSort}
        />
      </div>
    </div>
  );
}
