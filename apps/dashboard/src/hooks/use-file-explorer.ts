import { Path, Paths } from '@/lib/path'
import { trpc } from '@/trpc/client'
import { Result } from '@r2-drive/utils/result'
import { UIR2Item } from '@r2-drive/utils/types/item'
import { useSearchParams } from 'next/navigation'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { toast } from 'sonner'

type SortKey = 'name' | 'size' | 'lastModified'
type SortDirection = 'asc' | 'desc'

export interface FileExplorerState {
  bucketName: string | undefined
  path: Path
  items: UIR2Item[]
  sortKey: SortKey
  sortDirection: SortDirection
  selectedItemKeys: string[]
  isLoading: boolean
  sortedItems: UIR2Item[]
}

export interface FileExplorerActions {
  onSort: (key: SortKey) => void
  setPath: (folder: Path) => void
  onItemSelect: (itemId: string) => void
  onSelectAll: () => void
  onCreateFolder: (folderName: string) => Promise<Result>
  refreshItems: (folder: Path) => Promise<void>
  deselectItems: () => Promise<void>
}

export function useFileExplorer(): FileExplorerState & FileExplorerActions {
  // State
  const [path, setPath] = useState<Path>(Paths.getRoot())
  const [sortKey, setSortKey] = useState<SortKey>('name')
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc')
  const [selectedItems, setSelectedItems] = useState<string[]>([])
  const searchParams = useSearchParams()

  // Use tRPC list endpoint to fetch items for current path
  const {
    data: listResult,
    isLoading,
    refetch: refetchItems,
  } = trpc.r2.list.useQuery({ folder: path })

  // Extract items from the result and combine files and folders
  const items: UIR2Item[] = useMemo(() => {
    if (!listResult?.success) return []
    const allItems = [...listResult.data.folders, ...listResult.data.files]
    // Convert string lastModified to Date if it exists
    return allItems.map((item) => ({
      ...item,
      lastModified: item.lastModified ? new Date(item.lastModified) : undefined,
      dateCreated: item.dateCreated ? new Date(item.dateCreated) : undefined,
    }))
  }, [listResult])

  const bucketName = listResult?.success ? listResult.data.bucketName : undefined

  // Clear selection when path changes
  useEffect(() => {
    setSelectedItems([])
  }, [path])

  // Refresh function using tRPC query invalidation
  const utils = trpc.useUtils()

  const refreshItems = useCallback(
    async (folder: Path) => {
      await utils.r2.list.invalidate({ folder })
      // Refetch items to ensure UI is up to date
      await refetchItems()
      // Filter selected items that no longer exist
      const existingKeys = new Set(items.map((item) => item.path.key))
      setSelectedItems((prev) => prev.filter((key) => existingKeys.has(key)))
    },
    [utils.r2.list, refetchItems]
  )

  // Parse URL path on mount and when search params change
  useEffect(() => {
    const fullPath = Paths.fromURLSearchParams(searchParams)
    setPath(fullPath)
  }, [searchParams])

  // Sorting logic: folders always first, then sort by key/direction
  const sortedItems = useMemo(() => {
    const folders = items.filter((i) => i.path.isFolder)
    const files = items.filter((i) => !i.path.isFolder)
    const sortFn = (a: UIR2Item, b: UIR2Item) => {
      let aVal
      let bVal

      if (sortKey === 'name') {
        aVal = a.path?.name || ''
        bVal = b.path?.name || ''
      } else if (sortKey === 'size') {
        aVal = a.size ?? 0
        bVal = b.size ?? 0
      } else if (sortKey === 'lastModified') {
        aVal = new Date(a.lastModified || 0).getTime()
        bVal = new Date(b.lastModified || 0).getTime()
      } else {
        aVal = a[sortKey] || ''
        bVal = b[sortKey] || ''
      }

      if (aVal < bVal) return sortDirection === 'asc' ? -1 : 1
      if (aVal > bVal) return sortDirection === 'asc' ? 1 : -1
      return 0
    }
    return [...folders.sort(sortFn), ...files.sort(sortFn)]
  }, [items, sortKey, sortDirection])

  // Actions
  const onSort = useCallback(
    (key: SortKey) => {
      if (sortKey === key) {
        setSortDirection((d) => (d === 'asc' ? 'desc' : 'asc'))
      } else {
        setSortKey(key)
        setSortDirection('asc')
      }
    },
    [sortKey]
  )

  const onItemSelect = (itemId: string) => {
    setSelectedItems((prev) =>
      prev.includes(itemId) ? prev.filter((id) => id !== itemId) : [...prev, itemId]
    )
  }

  const onSelectAll = useCallback(() => {
    if (selectedItems.length === items.length) {
      setSelectedItems([])
    } else {
      setSelectedItems(items.map((item) => item.path.key))
    }
  }, [selectedItems])

  const deselectItems = useCallback(async () => {
    setSelectedItems([])
  }, [])

  const createFolder = trpc.r2.createFolder.useMutation()

  const onCreateFolder = useCallback(
    async (folderName: string): Promise<Result> => {
      const result = await createFolder.mutateAsync({ baseFolder: path, name: folderName })

      if (result.success) {
        // Refresh the items in the table using the new tRPC integration
        await refreshItems(path)
      } else {
        toast.error(`Failed to create folder`, {
          description: result.error.message,
        })
      }
      return result
    },
    [path, createFolder, refreshItems]
  )

  onCreateFolder

  return {
    // State
    bucketName,
    path,
    items,
    sortKey,
    sortDirection,
    selectedItemKeys: selectedItems,
    isLoading,
    sortedItems,
    // Actions
    onSort,
    setPath,
    onItemSelect,
    onSelectAll,
    onCreateFolder,
    refreshItems,
    deselectItems,
  }
}
