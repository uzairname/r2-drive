import { Path, Paths } from '@/lib/path'
import { useSearchParams } from 'next/navigation'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { toast } from 'sonner'
import { createFolder, getBucketName, listFiles } from '../lib/actions'
import { R2Item } from '../lib/r2-client'

type SortKey = 'name' | 'size' | 'lastModified'
type SortDirection = 'asc' | 'desc'

export interface FileExplorerState {
  bucketName: string
  path: Path
  items: R2Item[]
  sortKey: SortKey
  sortDirection: SortDirection
  selectedItemKeys: string[]
  isLoading: boolean
  sortedItems: R2Item[]
}

export interface FileExplorerActions {
  onSort: (key: SortKey) => void
  navigateToFolder: (folder: Path) => void
  onItemSelect: (itemId: string) => void
  onSelectAll: () => void
  onCreateFolder: (folderName: string) => Promise<{ success: boolean; error?: string }>
  fetchItems: (currentPath: Path) => Promise<void>
}

export function useFileExplorer(): FileExplorerState & FileExplorerActions {
  // State
  const [bucketName, setBucketName] = useState<string>('')
  const [path, setPath] = useState<Path>(Paths.getRoot())
  const [items, setItems] = useState<R2Item[]>([])
  const [sortKey, setSortKey] = useState<SortKey>('name')
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc')
  const [selectedItems, setSelectedItems] = useState<string[]>([])
  const [isLoading, setIsLoading] = useState<boolean>(false)

  const searchParams = useSearchParams()

  // Fetch bucket name on mount
  useEffect(() => {
    getBucketName().then(setBucketName)
  }, [])

  // Parse URL path on mount and when search params change
  useEffect(() => {
    const fullPath = Paths.fromURLSearchParams(searchParams)
    setPath(fullPath)
  }, [searchParams])

  const fetchItems = useCallback(
    async (path: Path) => {
      setIsLoading(true)

      const result = await listFiles(path)

      if (result.success) {
        const { objects, folders } = result.data
        setItems([...folders, ...objects])
        setSelectedItems([])
      } else {
        toast.error(`Failed to load files: ${result.error.message}`, {
          description: 'Loading Error',
          action: {
            label: 'Retry',
            onClick: () => fetchItems(path),
          },
        })
        setItems([])
      }
      setIsLoading(false)
    },
    [toast]
  )

  useEffect(() => {
    fetchItems(path)
  }, [path, fetchItems])

  // Sorting logic: folders always first, then sort by key/direction
  const sortedItems = useMemo(() => {
    const folders = items.filter((i) => i.path.isFolder)
    const files = items.filter((i) => !i.path.isFolder)
    const sortFn = (a: R2Item, b: R2Item) => {
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
  }, [selectedItems.length, items])

  const onCreateFolder = useCallback(
    async (folderName: string) => {
      try {
        const result = await createFolder(path, folderName)

        if (result.success) {
          await fetchItems(path)
        } else {
          toast.error(`Failed to create folder: ${result.error}`, {
            description: 'Folder Creation Error',
          })
        }

        return result
      } catch (error) {
        toast.error('An unexpected error occurred while creating the folder', {
          description: 'Unexpected Error',
        })
        return { success: false, error: 'Unexpected error' } as const
      }
    },
    [path, fetchItems, toast]
  )

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
    navigateToFolder: setPath,
    onItemSelect,
    onSelectAll,
    onCreateFolder,
    fetchItems,
  }
}
