import { clearCookie, getCookie } from '@/lib/cookies'
import { Path, Paths } from '@/lib/path'
import { trpc } from '@/trpc/client'
import { Result } from '@r2-drive/utils/result'
import { UIR2Item } from '@r2-drive/utils/types/item'
import { useRouter, useSearchParams } from 'next/navigation'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { toast } from 'sonner'

const PENDING_REDIRECT_COOKIE = 'r2-pending-redirect-token'

type SortKey = 'name' | 'size' | 'lastModified'
type SortDirection = 'asc' | 'desc'

export interface FileExplorerState {
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
  onItemSelect: (itemId: string, shiftKey?: boolean) => void
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
  const [lastSelectedIndex, setLastSelectedIndex] = useState<number | null>(null)
  const searchParams = useSearchParams()
  const router = useRouter()
  const hasHandledRedirectRef = useRef(false)

  // Use tRPC list endpoint to fetch items for current path
  const {
    data: listResult,
    isLoading,
    refetch: refetchItems,
  } = trpc.r2.list.useQuery({ folder: path })

  // Check for pending redirect token
  const [pendingTokenId, setPendingTokenId] = useState<string | null>(() => {
    if (typeof document === 'undefined') return null
    return getCookie(PENDING_REDIRECT_COOKIE) ?? null
  })

  // Use tRPC to get the path for the pending redirect token
  const { data: tokenPathData } = trpc.sharing.getTokenPath.useQuery(
    { tokenId: pendingTokenId ?? '' },
    {
      enabled: !!pendingTokenId && !hasHandledRedirectRef.current,
    }
  )

  // Handle redirect to shared directory when a new token is used
  useEffect(() => {
    if (hasHandledRedirectRef.current) return
    if (!pendingTokenId) return
    if (!tokenPathData) return

    hasHandledRedirectRef.current = true
    clearCookie(PENDING_REDIRECT_COOKIE)
    setPendingTokenId(null)

    const pathPrefix = tokenPathData.pathPrefix
    if (pathPrefix === null) return // Token not found or expired

    // Navigate to the token's path (empty string means root, no redirect needed)
    if (pathPrefix !== '') {
      const targetPath = Paths.fromR2Key(pathPrefix)
      const searchParams = Paths.toURLSearchParams(targetPath)
      const queryString = searchParams.toString()
      router.push(`/explorer${queryString ? `?${queryString}` : ''}`)
    }
  }, [tokenPathData, pendingTokenId, router])

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

  // Clear selection when path changes
  useEffect(() => {
    setSelectedItems([])
    setLastSelectedIndex(null)
  }, [path])

  // Clean up selected items that no longer exist when items change
  useEffect(() => {
    setSelectedItems((prev) => {
      if (prev.length === 0) return prev
      const existingKeys = new Set(items.map((item) => item.path.key))
      const filtered = prev.filter((key) => existingKeys.has(key))
      return filtered.length === prev.length ? prev : filtered
    })
  }, [items])

  // Refresh function using tRPC query invalidation
  const utils = trpc.useUtils()

  const refreshItems = useCallback(
    async (folder: Path) => {
      await utils.r2.list.invalidate({ folder })
      // Refetch items to ensure UI is up to date
      await refetchItems()
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
      let comparison = 0
      
      if (sortKey === 'name') {
        const aName = a.path?.name || ''
        const bName = b.path?.name || ''
        comparison = aName.localeCompare(bName, undefined, { numeric: true, sensitivity: 'base' })
      } else if (sortKey === 'size') {
        const aVal = a.size ?? 0
        const bVal = b.size ?? 0
        comparison = aVal - bVal
      } else if (sortKey === 'lastModified') {
        // lastModified is already a Date object, use getTime() directly
        const aVal = a.lastModified?.getTime() ?? 0
        const bVal = b.lastModified?.getTime() ?? 0
        comparison = aVal - bVal
      }
      
      return sortDirection === 'asc' ? comparison : -comparison
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

  const onItemSelect = useCallback((itemId: string, shiftKey = false) => {
    const currentIndex = sortedItems.findIndex((item) => item.path.key === itemId)
    
    if (shiftKey && lastSelectedIndex !== null && currentIndex !== -1) {
      // Shift-click: select range from last selected to current
      const start = Math.min(lastSelectedIndex, currentIndex)
      const end = Math.max(lastSelectedIndex, currentIndex)
      const rangeKeys = sortedItems.slice(start, end + 1).map((item) => item.path.key)
      
      // Add range to selection (don't remove existing selections)
      setSelectedItems((prev) => {
        const newSelection = new Set([...prev, ...rangeKeys])
        return Array.from(newSelection)
      })
    } else {
      // Regular click: toggle single item
      setSelectedItems((prev) =>
        prev.includes(itemId) ? prev.filter((id) => id !== itemId) : [...prev, itemId]
      )
      setLastSelectedIndex(currentIndex)
    }
  }, [sortedItems, lastSelectedIndex])

  const onSelectAll = useCallback(() => {
    if (selectedItems.length === items.length && items.length > 0) {
      setSelectedItems([])
    } else {
      setSelectedItems(items.map((item) => item.path.key))
    }
  }, [selectedItems, items])

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
