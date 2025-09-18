import { useState, useEffect, useCallback, useMemo } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { listFiles, createFolder, getBucketName } from "../lib/actions";
import { R2Item } from "../lib/r2-client";
import { useErrorToast } from "@workspace/ui/components/toast";
import { URLStateManager } from "../lib/url-state-manager";
import { Path, Paths } from "@/lib/path-system/path";

type SortKey = "name" | "size" | "lastModified";
type SortDirection = "asc" | "desc";

export interface FileExplorerState {
  bucketName: string;
  path: Path;
  items: R2Item[];
  sortKey: SortKey;
  sortDirection: SortDirection;
  selectedItemKeys: string[];
  navigatingToFolder: string | null;
  isLoading: boolean;
  sortedItems: R2Item[];
}

export interface FileExplorerActions {
  onSort: (key: SortKey) => void;
  navigateToFolder: (folder: Path) => void;
  onItemSelect: (itemId: string) => void;
  onSelectAll: () => void;
  onCreateFolder: (folderName: string) => Promise<{ success: boolean; error?: string }>;
  fetchItems: (currentPath: Path) => Promise<void>;
  updateUrl: (newPath: Path) => void;
}

export function useFileExplorer(): FileExplorerState & FileExplorerActions {
  const router = useRouter();
  const searchParams = useSearchParams();
  const errorToast = useErrorToast();

  // Create URL state manager instance
  const urlStateManager = useMemo(() => new URLStateManager(router), [router]);

  // State
  const [bucketName, setBucketName] = useState<string>("");
  const [path, setPath] = useState<Path>(Paths.getRoot());
  const [items, setItems] = useState<R2Item[]>([]);
  const [sortKey, setSortKey] = useState<SortKey>("name");
  const [sortDirection, setSortDirection] = useState<SortDirection>("asc");
  const [selectedItems, setSelectedItems] = useState<string[]>([]);
  const [navigatingToFolder, setNavigatingToFolder] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);

  // Update URL when path changes
  const updateUrl = useCallback((newPath: Path) => {
    urlStateManager.updateUrl(newPath);
  }, [urlStateManager]);

  // Parse URL path on mount and when search params change
  useEffect(() => {
    const fullPath = Paths.fromURLSearchParams(searchParams);
    setPath(fullPath);
  }, [searchParams]);

  // Fetch bucket name on mount
  useEffect(() => {
    const fetchBucketName = async () => {
      setBucketName(await getBucketName());
    };
    fetchBucketName();
  }, []);

  const fetchItems = useCallback(async (path: Path) => {
    setIsLoading(true);

    const result = await listFiles(path);

    if (result.success) {
      const { objects, folders } = result.data;
      setItems([
        ...folders,
        ...objects,
      ]);
      setSelectedItems([]);
      // Clear navigation state when we successfully load a new path
      setNavigatingToFolder(null);
    } else {
      errorToast(`Failed to load files: ${result.error.message}`, {
        title: "Loading Error",
        action: {
          label: "Retry",
          onClick: () => fetchItems(path)
        }
      });
      setItems([]);
    }
    setIsLoading(false);

  }, [errorToast]);

  useEffect(() => {
    fetchItems(path);
  }, [path, fetchItems, bucketName]);

  // Sorting logic: folders always first, then sort by key/direction
  const sortedItems = useMemo(() => {
    const folders = items.filter(i => i.path.isFolder);
    const files = items.filter(i => !i.path.isFolder);
    const sortFn = (a: any, b: any) => {
      let aVal = a[sortKey] || "";
      let bVal = b[sortKey] || "";
      if (sortKey === "size") {
        // Parse size string to bytes for sorting
        const parse = (s: string) => {
          if (!s) return 0;
          const [num, unit] = s.split(" ");
          const units = ["B", "KB", "MB", "GB", "TB", "PB", "EB", "ZB", "YB"];
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
  const onSort = useCallback((key: SortKey) => {
    if (sortKey === key) {
      setSortDirection(d => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(key);
      setSortDirection("asc");
    }
  }, [sortKey]);

  const navigateToFolder = useCallback((folder: Path) => {
    // Prevent rapid successive clicks to the same folder
    if (navigatingToFolder === folder.key) return;
    setNavigatingToFolder(folder.key);

    updateUrl(folder);

    // Clear the navigation state after a short delay
    setTimeout(() => setNavigatingToFolder(null), 500);
  }, [navigatingToFolder, updateUrl]);

  // const onBreadcrumbClick = useCallback((folder: Path) => {
  //   updateUrl(folder);
  // }, [updateUrl]);

  const onItemSelect = useCallback((itemId: string) => {
    setSelectedItems(prev => prev.includes(itemId) ? prev.filter(id => id !== itemId) : [...prev, itemId]);
  }, []);

  const onSelectAll = useCallback(() => {
    if (selectedItems.length === items.length) {
      setSelectedItems([]);
    } else {
      setSelectedItems(items.map(item => item.path.key));
    }
  }, [selectedItems.length, items]);

  const onCreateFolder = useCallback(async (folderName: string) => {

    try {
      const result = await createFolder(path, folderName);

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
    selectedItemKeys: selectedItems,
    navigatingToFolder,
    isLoading,
    sortedItems,
    // Actions
    onSort,
    navigateToFolder,
    onItemSelect,
    onSelectAll,
    onCreateFolder,
    fetchItems,
    updateUrl,
  };
}