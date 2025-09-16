"use client";

import React, { useState, useEffect, useCallback } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { listFiles, createFolder, getBucketName } from "../../lib/actions";
import { R2BucketNavigator } from "@/components/r2/file-navigator";
import { deleteObjects } from "../../lib/actions";
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
    lastModified: type === "folder" ? "-" : (item.lastModified.toISOString().slice(0, 10))
  };
}

type SortKey = "name" | "size" | "lastModified";
type SortDirection = "asc" | "desc";


export default function ExplorerPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [bucketName, setBucketName] = useState<string>("");
  const [path, setPath] = useState<string[]>([]);
  const [items, setItems] = useState<UIFileItem[]>([]);
  const [sortKey, setSortKey] = useState<SortKey>("name");
  const [sortDirection, setSortDirection] = useState<SortDirection>("asc");
  const [selectedItems, setSelectedItems] = useState<string[]>([]);
  const [navigatingToFolder, setNavigatingToFolder] = useState<string | null>(null);

  // Update URL when path changes
  const updateUrl = useCallback((newPath: string[]) => {
    const pathParam = newPath.slice(1).join("/"); // Remove bucket name from URL path
    const params = new URLSearchParams();
    if (pathParam) {
      params.set("path", pathParam);
    }
    const paramString = params.toString();
    const url = paramString ? `/explorer?${paramString}` : "/explorer";
    router.replace(url);
  }, [router]);

  // Parse URL path on mount and when search params change
  useEffect(() => {
    const urlPath = searchParams.get("path");
    if (bucketName && urlPath !== null) {
      const pathSegments = urlPath ? urlPath.split("/").filter(Boolean) : [];
      const fullPath = [bucketName, ...pathSegments];
      setPath(fullPath);
    }
  }, [searchParams, bucketName]);

  // Fetch bucket name on mount
  useEffect(() => {
    const fetchBucketName = async () => {
      const name = await getBucketName();
      setBucketName(name);
      
      // Initialize path from URL or set to bucket root
      const urlPath = searchParams.get("path");
      if (urlPath) {
        const pathSegments = urlPath.split("/").filter(Boolean);
        setPath([name, ...pathSegments]);
      } else {
        setPath([name]);
      }
    };
    fetchBucketName();
  }, []);

  const fetchItems = useCallback(async (currentPath: string[]) => {
    const joined = currentPath.slice(1).join("/");
    console.log(`Fetching items for path: "${joined}"`);
    const { objects, folders } = await listFiles(joined);
    setItems([
      ...folders.map(f => toUiFileItem(f, "folder")),
      ...objects.map(f => toUiFileItem(f, "file")),
    ]);
    setSelectedItems([]);
    // Clear navigation state when we successfully load a new path
    setNavigatingToFolder(null);
  }, []);

  useEffect(() => {
    if (bucketName && path.length > 0) {
      fetchItems(path);
    }
  }, [path, fetchItems, bucketName]);

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
    // Prevent rapid successive clicks to the same folder
    if (navigatingToFolder === folderName) {
      return;
    }
    
    // Check if we're already in a subfolder of the clicked folder
    if (path.length > 1 && path[path.length - 1] === folderName) {
      return;
    }
    
    setNavigatingToFolder(folderName);
    const newPath = [...path, folderName];
    setPath(newPath);
    updateUrl(newPath);
    
    // Clear the navigation state after a short delay
    setTimeout(() => setNavigatingToFolder(null), 500);
  };
  
  const handleBreadcrumbClick = (index: number) => {
    const newPath = path.slice(0, index + 1);
    setPath(newPath);
    updateUrl(newPath);
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
      onProgress,
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
      // The itemId is the full key (item.key from FileItem)
      // For folders, this already includes the trailing slash
      // For files in subfolders, we need to prepend the current path only if itemId doesn't already include it
      
      if (itemId.includes('/') || !currentFolder) {
        // The itemId is already a full key (e.g., for folders with trailing slash)
        // or we're in the root directory
        return itemId;
      } else {
        // Regular file in a subfolder - prepend the current path
        return `${currentFolder}/${itemId}`;
      }
    });

    const result = await deleteObjects(keysToDelete);
    
    if (result.errors && result.errors.length > 0) {
      console.error("Some items failed to delete:", result.errors);
      // You could show a toast notification here
    }
    
    // Refresh the file list
    await fetchItems(path);
  };

  const handleDownload = async (selectedItemIds: string[]) => {
    const currentFolder = path.slice(1).join("/");
    
    for (const itemId of selectedItemIds) {
      try {
        // Build the full key for the file
        // For folders, we skip download as they're just markers
        if (itemId.endsWith('/')) {
          console.log(`Skipping download for folder: ${itemId}`);
          continue;
        }
        
        let key: string;
        if (itemId.includes('/') || !currentFolder) {
          // The itemId is already a full key or we're in root
          key = itemId;
        } else {
          // Regular file in a subfolder - prepend the current path
          key = `${currentFolder}/${itemId}`;
        }
        
        // Use the API route for download
        const url = `/api/download?key=${encodeURIComponent(key)}`;
        
        // Create a download link
        const a = document.createElement('a');
        a.href = url;
        a.download = itemId.split('/').pop() || itemId; // Use the last part as filename
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
      } catch (error) {
        console.error(`Error downloading ${itemId}:`, error);
      }
    }
  };

  const handleCreateFolder = async (folderName: string) => {
    const currentFolder = path.slice(1).join("/");
    const result = await createFolder(currentFolder, folderName);
    
    // Refresh the file list after successful folder creation
    if (result.success) {
      await fetchItems(path);
    }
    
    return result;
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
          handleCreateFolder={handleCreateFolder}
          sortKey={sortKey}
          sortDirection={sortDirection}
          handleSort={handleSort}
        />
      </div>
    </div>
  );
}
