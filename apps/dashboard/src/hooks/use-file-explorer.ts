import { useState, useEffect, useCallback, useMemo } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { listFiles, createFolder, getBucketName } from "../lib/actions";
import { FileItem } from "../lib/r2-client";
import type { UIFileItem } from "@/components/file-navigator/file-table";
import { useErrorToast } from "@workspace/ui/components/toast";
import { URLStateManager } from "../lib/url-state-manager";

type SortKey = "name" | "size" | "lastModified";
type SortDirection = "asc" | "desc";

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

export interface FileExplorerState {
  bucketName: string;
  path: string[];
  items: UIFileItem[];
  sortKey: SortKey;
  sortDirection: SortDirection;
  selectedItems: string[];
  navigatingToFolder: string | null;
  isLoading: boolean;
  sortedItems: UIFileItem[];
}

export interface FileExplorerActions {
  onSort: (key: SortKey) => void;
  onFolderClick: (folderId: string) => void;
  onBreadcrumbClick: (index: number) => void;
  onItemSelect: (itemId: string) => void;
  onSelectAll: () => void;
  onCreateFolder: (folderName: string) => Promise<{ success: boolean; error?: string }>;
  fetchItems: (currentPath: string[]) => Promise<void>;
  updateUrl: (newPath: string[]) => void;
}

export function useFileExplorer(): FileExplorerState & FileExplorerActions {
  const router = useRouter();
  const searchParams = useSearchParams();
  const errorToast = useErrorToast();
  
  // Create URL state manager instance
  const urlStateManager = useMemo(() => new URLStateManager(router), [router]);

  // State
  const [bucketName, setBucketName] = useState<string>("");
  const [path, setPath] = useState<string[]>([]);
  const [items, setItems] = useState<UIFileItem[]>([]);
  const [sortKey, setSortKey] = useState<SortKey>("name");
  const [sortDirection, setSortDirection] = useState<SortDirection>("asc");
  const [selectedItems, setSelectedItems] = useState<string[]>([]);
  const [navigatingToFolder, setNavigatingToFolder] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);

  // Update URL when path changes
  const updateUrl = useCallback((newPath: string[]) => {
    urlStateManager.updateUrl(newPath);
  }, [urlStateManager]);

  // Parse URL path on mount and when search params change
  useEffect(() => {
    const urlPath = urlStateManager.getCurrentPath(searchParams);
    if (bucketName && urlPath !== null) {
      const fullPath = urlStateManager.parseUrlPath(urlPath, bucketName);
      setPath(fullPath);
    }
  }, [searchParams, bucketName, urlStateManager]);

  // Fetch bucket name on mount
  useEffect(() => {
    const fetchBucketName = async () => {
      const result = await getBucketName();
      
      if (result.success) {
        const name = result.data;
        setBucketName(name);
        
        // Initialize path from URL or set to bucket root
        const urlPath = urlStateManager.getCurrentPath(searchParams);
        if (urlPath) {
          const fullPath = urlStateManager.parseUrlPath(urlPath, name);
          setPath(fullPath);
        } else {
          setPath([name]);
        }
      } else {
        errorToast("Failed to load bucket configuration", {
          title: "Configuration Error",
          action: {
            label: "Retry",
            onClick: () => window.location.reload()
          }
        });
      }
    };
    fetchBucketName();
  }, [searchParams, errorToast, urlStateManager]);

  const fetchItems = useCallback(async (currentPath: string[]) => {
    const joined = currentPath.slice(1).join("/");
    setIsLoading(true);
    
    try {
      const result = await listFiles(joined);
      
      if (result.success) {
        const { objects, folders } = result.data;
        setItems([
          ...folders.map(f => toUiFileItem(f, "folder")),
          ...objects.map(f => toUiFileItem(f, "file")),
        ]);
        setSelectedItems([]);
        // Clear navigation state when we successfully load a new path
        setNavigatingToFolder(null);
      } else {
        errorToast(`Failed to load files: ${result.error.message}`, {
          title: "Loading Error",
          action: {
            label: "Retry",
            onClick: () => fetchItems(currentPath)
          }
        });
        setItems([]);
      }
    } catch (error) {
      errorToast("An unexpected error occurred while loading files", {
        title: "Unexpected Error",
        action: {
          label: "Retry",
          onClick: () => fetchItems(currentPath)
        }
      });
      setItems([]);
    } finally {
      setIsLoading(false);
    }
  }, [errorToast]);

  useEffect(() => {
    if (bucketName && path.length > 0) {
      fetchItems(path);
    }
  }, [path, fetchItems, bucketName]);

  // Sorting logic: folders always first, then sort by key/direction
  const sortedItems = useMemo(() => {
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

  // Actions
  const handleSort = useCallback((key: SortKey) => {
    if (sortKey === key) {
      setSortDirection(d => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(key);
      setSortDirection("asc");
    }
  }, [sortKey]);

  const handleFolderClick = useCallback((folderId: string) => {
    // Extract folder name from the folder ID (which is the full path)
    // For folder IDs like "A/B/" we want to get "B" as the folder name
    const folderName = folderId.endsWith("/") 
      ? folderId.slice(0, -1).split("/").pop() || folderId
      : folderId.split("/").pop() || folderId;
    
    // Prevent rapid successive clicks to the same folder
    if (navigatingToFolder === folderId) {
      return;
    }
    
    setNavigatingToFolder(folderId);
    const newPath = [...path, folderName];
    setPath(newPath);
    updateUrl(newPath);
    
    // Clear the navigation state after a short delay
    setTimeout(() => setNavigatingToFolder(null), 500);
  }, [path, navigatingToFolder, updateUrl]);
  
  const handleBreadcrumbClick = useCallback((index: number) => {
    const newPath = path.slice(0, index + 1);
    setPath(newPath);
    updateUrl(newPath);
  }, [path, updateUrl]);

  const handleItemSelect = useCallback((itemId: string) => {
    setSelectedItems(prev => prev.includes(itemId) ? prev.filter(id => id !== itemId) : [...prev, itemId]);
  }, []);

  const handleSelectAll = useCallback(() => {
    if (selectedItems.length === items.length) {
      setSelectedItems([]);
    } else {
      setSelectedItems(items.map(item => item.id));
    }
  }, [selectedItems.length, items]);

  const handleCreateFolder = useCallback(async (folderName: string) => {
    const currentFolder = path.slice(1).join("/");
    
    try {
      const result = await createFolder(currentFolder, folderName);
      
      if (result.success) {
        await fetchItems(path);
      } else {
        errorToast(`Failed to create folder: ${result.error}`, {
          title: "Folder Creation Error"
        });
      }
      
      return result;
    } catch (error) {
      errorToast("An unexpected error occurred while creating the folder", {
        title: "Unexpected Error"
      });
      return { success: false, error: "Unexpected error" } as const;
    }
  }, [path, fetchItems, errorToast]);

  return {
    // State
    bucketName,
    path,
    items,
    sortKey,
    sortDirection,
    selectedItems,
    navigatingToFolder,
    isLoading,
    sortedItems,
    // Actions
    onSort: handleSort,
    onFolderClick: handleFolderClick,
    onBreadcrumbClick: handleBreadcrumbClick,
    onItemSelect: handleItemSelect,
    onSelectAll: handleSelectAll,
    onCreateFolder: handleCreateFolder,
    fetchItems,
    updateUrl,
  };
}